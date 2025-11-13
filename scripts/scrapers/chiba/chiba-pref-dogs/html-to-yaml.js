#!/usr/bin/env node

/**
 * 千葉県動物愛護センター（犬） YAML抽出スクリプト
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
  municipality: 'chiba/chiba-pref-dogs',
  municipalityId: 17, // 千葉県動物愛護センター
  base_url: 'https://www.pref.chiba.lg.jp',
  source_url: 'https://www.pref.chiba.lg.jp/aigo/pet/inu-neko/shuuyou/shuu-inu-tou.html',
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

function extractDogFromBlock($, $block, index) {
  const $col2L = $block.find('.col2L');

  if ($col2L.length === 0) {
    return null;
  }

  const textLines = [];
  $col2L.find('p').each((i, p) => {
    const text = $(p).text().trim();
    if (text && text !== '&nbsp;') {
      textLines.push(text);
    }
  });

  const managementNumber = textLines.find((line) => line.includes('【管理番号】'));
  if (!managementNumber) {
    return null;
  }

  const location = textLines.find((line) => line.includes('【収容場所】')) || '';

  const typeInfo = textLines.find(
    (line) => !line.includes('【') && (line.includes('オス') || line.includes('メス'))
  );

  const $img = $col2L.find('img');
  const images = [];
  if ($img.length > 0) {
    const src = $img.attr('src');
    if (src && !src.includes('no_gazou')) {
      const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
      images.push(fullUrl);
    }
  }

  const deadlineLine = textLines.find((line) => line.includes('【掲載期限】'));
  let deadline_date = null;
  if (deadlineLine) {
    const match = deadlineLine.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      deadline_date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }

  let gender = 'unknown';
  if (typeInfo) {
    if (typeInfo.includes('オス')) {
      gender = 'male';
    } else if (typeInfo.includes('メス')) {
      gender = 'female';
    }
  }

  const blockText = textLines.join(' ');
  const status = getAdoptionStatus(blockText);

  return {
    external_id: `chiba-pref-dog-${index}`,
    name: managementNumber.replace('【管理番号】', '').trim(),
    animal_type: 'dog',
    breed: null,
    age_estimate: null,
    gender: gender,
    color: typeInfo,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: images,
    protection_date: null,
    deadline_date: deadline_date,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['収容犬情報', location],
    listing_type: 'lost_pet',
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 千葉県動物愛護センター（犬） - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];

    $('.column2.clearfix').each((index, element) => {
      const dog = extractDogFromBlock($, $(element), index);
      if (dog) {
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

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

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
          municipality_id: CONFIG.municipalityId,
          total_count: allDogs.length,
        },
        animals: allDogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // エラー時も履歴を保存
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
