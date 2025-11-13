#!/usr/bin/env node

/**
 * 千葉市動物保護指導センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'chiba/chiba-city-dogs',
  base_url: 'https://www.city.chiba.jp',
  source_url:
    'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seikatsueisei/dobutsuhogo/transferdogs.html',
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

function parseGender(text) {
  if (!text) return 'unknown';
  text = text.toLowerCase();
  if (text.includes('オス') || text.includes('雄') || text.includes('♂')) return 'male';
  if (text.includes('メス') || text.includes('雌') || text.includes('♀')) return 'female';
  return 'unknown';
}

function extractDogInfo($, element, index) {
  const textLines = [];
  let detailText = '';

  $(element)
    .find('*')
    .contents()
    .each((i, node) => {
      if (node.type === 'text') {
        const text = $(node).text().trim();
        if (text) textLines.push(text);
      }
    });

  detailText = textLines.join(' ');

  let external_id = null;
  let name = null;
  let age_estimate = null;
  let gender = 'unknown';
  let color = null;
  let personality = null;

  textLines.forEach((line) => {
    if (line.includes('管理番号') || line.includes('No.')) {
      external_id = line.replace(/管理番号|No\.|:|：/g, '').trim();
    } else if (line.includes('犬種') || line.includes('種類')) {
      name = line.replace(/犬種|種類|:|：/g, '').trim();
    } else if (line.includes('年齢') || line.includes('推定')) {
      age_estimate = line.replace(/年齢|推定|:|：/g, '').trim();
    } else if (line.includes('性別') || line.includes('オス') || line.includes('メス')) {
      gender = parseGender(line);
    } else if (line.includes('毛色') || line.includes('色')) {
      color = line.replace(/毛色|色|:|：/g, '').trim();
    } else if (line.includes('コメント') || line.includes('性格')) {
      personality = line.replace('コメント：', '').trim();
    }
  });

  if (!external_id) {
    external_id = `chiba-city-dog-${index}`;
  }

  // 譲渡済み判定
  const isAdopted =
    detailText.includes('譲渡済み') ||
    detailText.includes('譲渡しました') ||
    detailText.includes('譲渡決定');

  return {
    external_id,
    name,
    animal_type: 'dog',
    breed: null,
    age_estimate,
    gender,
    color,
    size: null,
    health_status: null,
    personality,
    special_needs: null,
    images: [],
    protection_date: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'medium',
    extraction_notes: [],
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 千葉市動物保護指導センター（犬） - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];

    $('div.animal-info, div.content div, article section').each((index, element) => {
      const dog = extractDogInfo($, element, index);
      if (dog.external_id) {
        allDogs.push(dog);
      }
    });

    console.log(`📊 検出した犬数: ${allDogs.length}`);

    if (allDogs.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

    allDogs.forEach((dog, index) => {
      console.log(`\n--- 犬 ${index + 1}/${allDogs.length} ---`);
      console.log(`   ID: ${dog.external_id}`);
      console.log(`   名前: ${dog.name || '不明'}, 性別: ${dog.gender}`);
    });

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
          municipality_id: 18, // 千葉市動物保護指導センター
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
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
