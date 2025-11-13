#!/usr/bin/env node

/**
 * 福井県動物愛護管理センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'fukui/fukui-pref-dogs',
  base_url: 'https://www.fapscsite.com',
  source_url: 'https://www.fapscsite.com/adoptable_animal/animal_kind/dog/',
};

// ========================================
// ユーティリティ
// ========================================

function getLatestHtmlFile() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(htmlDir)) {
    throw new Error(`HTMLディレクトリが見つかりません: ${htmlDir}`);
  }

  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('_tail.html'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('HTMLファイルが見つかりません');
  }

  return path.join(htmlDir, files[0]);
}

function parseGenderString(genderStr) {
  const results = [];

  const maleMatch = genderStr.match(/オス[：:]\s*(\d+)\s*匹/);
  const femaleMatch = genderStr.match(/メス[：:]\s*(\d+)\s*匹/);

  if (maleMatch) {
    const count = parseInt(maleMatch[1], 10);
    for (let i = 0; i < count; i++) {
      results.push({ gender: 'male', index: i });
    }
  }

  if (femaleMatch) {
    const count = parseInt(femaleMatch[1], 10);
    for (let i = 0; i < count; i++) {
      results.push({ gender: 'female', index: i });
    }
  }

  if (results.length === 0) {
    if (genderStr.includes('オス')) {
      results.push({ gender: 'male', index: 0 });
    } else if (genderStr.includes('メス')) {
      results.push({ gender: 'female', index: 0 });
    } else {
      results.push({ gender: 'unknown', index: 0 });
    }
  }

  return results;
}

function parseManagementNumbers(title) {
  const match = title.match(/管理番号[：:]\s*([A-Z0-9.]+)/);
  if (!match) {
    return [];
  }

  const idsStr = match[1].split('(')[0];
  const ids = idsStr.split('.').map((id) => id.trim());

  return ids;
}

function parseLocation(title) {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractSpecsFromDl($, $article) {
  const specs = {};
  const $dl = $article.find('dl.spec');

  $dl.find('dt').each((i, dt) => {
    const $dt = $(dt);
    const $dd = $dt.next('dd');

    if ($dd.length > 0) {
      const key = $dt.text().trim();
      const value = $dd.text().trim();
      specs[key] = value;
    }
  });

  return specs;
}

function extractImages($, $article) {
  const images = [];
  $article.find('.uk-slideshow-items img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      images.push(src);
    }
  });
  return images;
}

function extractDogsFromArticle($, article) {
  const $article = $(article);
  const dogs = [];

  const title = $article.find('h2.entry-title').text().trim();
  const managementNumbers = parseManagementNumbers(title);
  const location = parseLocation(title);

  if (managementNumbers.length === 0) {
    console.warn(`⚠️ 管理番号が見つかりません: ${title}`);
    return dogs;
  }

  const specs = extractSpecsFromDl($, $article);
  const images = extractImages($, $article);

  const genderInfo = specs['性別']
    ? parseGenderString(specs['性別'])
    : [{ gender: 'unknown', index: 0 }];

  const totalDogs = Math.max(managementNumbers.length, genderInfo.length);

  for (let i = 0; i < totalDogs; i++) {
    let externalId;

    if (managementNumbers.length >= totalDogs && managementNumbers[i]) {
      externalId = managementNumbers[i];
    } else if (managementNumbers.length > 0) {
      const baseId = managementNumbers[i] || managementNumbers[0];
      externalId = `${baseId}-${i + 1}`;
    } else {
      externalId = `fukui-dog-unknown-${Date.now()}-${i}`;
    }

    const gender = genderInfo[i] ? genderInfo[i].gender : 'unknown';

    const articleText = $article.text();
    const isAdopted =
      articleText.includes('譲渡済み') ||
      articleText.includes('譲渡しました') ||
      articleText.includes('譲渡決定') ||
      (specs['その他'] && specs['その他'].includes('譲渡済'));

    const dog = {
      external_id: externalId,
      animal_type: 'dog',
      name: null,
      breed: specs['品種'] || null,
      age_estimate: specs['年齢'] || null,
      gender: gender,
      color: specs['毛種／毛色'] || specs['毛色'] || null,
      size: specs['体格'] || null,
      health_status: null,
      personality: null,
      special_needs: specs['その他'] || null,
      images: images.length > 0 ? images : [],
      protection_location: specs['収容場所'] || location || null,
      status: isAdopted ? 'adopted' : 'available',
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [],
    };

    if (images.length === 0) {
      dog.extraction_notes.push('画像が見つかりませんでした');
      dog.confidence_level = 'medium';
    }

    if (!dog.external_id) {
      dog.extraction_notes.push('管理番号が取得できませんでした');
      dog.confidence_level = 'low';
    }

    if (!dog.gender || dog.gender === 'unknown') {
      dog.extraction_notes.push('性別情報が不明確です');
      dog.confidence_level = 'medium';
    }

    dogs.push(dog);
  }

  return dogs;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 福井県動物愛護管理センター（犬） - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const articles = $('article.animal-item').toArray();
    console.log(`📊 検出したアーティクル数: ${articles.length}`);

    if (articles.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

    const allDogs = [];
    articles.forEach((article, index) => {
      console.log(`\n--- アーティクル ${index + 1}/${articles.length} ---`);
      const dogs = extractDogsFromArticle($, article);
      dogs.forEach((dog) => {
        console.log(`   犬: ${dog.external_id}, 性別: ${dog.gender}`);
        allDogs.push(dog);
      });
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allAnimals.length || allCats.length || allDogs.length);

    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_tail.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: 5, // 福井県動物愛護管理センター
          total_count: allDogs.length,
        },
        animals: allDogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
