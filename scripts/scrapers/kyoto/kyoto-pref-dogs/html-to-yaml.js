#!/usr/bin/env node

/**
 * 京都府動物愛護管理センター（犬） YAML抽出スクリプト
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
  municipality: 'kyoto/kyoto-pref-dogs',
  base_url: 'https://kyoto-ani-love.com',
  source_url: 'https://kyoto-ani-love.com/recruit-animal/dog/',
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

function parseGender(genderStr) {
  if (!genderStr) return 'unknown';
  if (genderStr.includes('オス') || genderStr.includes('雄')) return 'male';
  if (genderStr.includes('メス') || genderStr.includes('雌')) return 'female';
  return 'unknown';
}

function extractTableInfo($, $table) {
  const info = {};

  $table.find('tr').each((i, row) => {
    const $row = $(row);
    const $th = $row.find('th');
    const $td = $row.find('td');

    if ($th.length > 0 && $td.length > 0) {
      const key = $th.text().trim();
      const value = $td.text().trim();
      info[key] = value;
    }
  });

  return info;
}

function extractDogFromContent($, content, index) {
  const $content = $(content);

  const title = $content.find('h2').text().trim();

  let name = title.replace(/センター名[：:]/g, '').trim();
  name = name.replace(/[（(].*?[）)]/g, '').trim();

  if (!name) {
    name = `京都犬${index + 1}号`;
  }

  const timestamp = Date.now();
  const external_id = `kyoto-dog-${timestamp}-${index}`;

  const imageUrl = $content.find('div.image.img-rollover a').attr('href');
  const images = imageUrl ? [imageUrl] : [];

  const $table = $content.find('table.info');
  const tableInfo = extractTableInfo($, $table);

  const gender = parseGender(tableInfo['性別']);

  const contentText = $content.text();
  const isAdopted =
    title.includes('新しい飼い主さんが決まりました') ||
    title.includes('決まりました') ||
    contentText.includes('譲渡済み') ||
    contentText.includes('譲渡しました') ||
    contentText.includes('譲渡決定');

  const dog = {
    external_id: external_id,
    name: name,
    animal_type: 'dog',
    breed: tableInfo['種類'] || null,
    age_estimate: tableInfo['年齢'] || tableInfo['推定年齢'] || null,
    gender: gender,
    color: tableInfo['毛色'] || null,
    size: tableInfo['体格'] || null,
    health_status: tableInfo['健康状態'] || null,
    personality: tableInfo['性格'] || tableInfo['特徴'] || null,
    special_needs: null,
    images: images,
    protection_location: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [],
  };

  if (images.length === 0) {
    dog.extraction_notes.push('画像が見つかりませんでした');
    dog.confidence_level = 'medium';
  }

  if (Object.keys(tableInfo).length === 0) {
    dog.extraction_notes.push('詳細情報テーブルが見つかりませんでした');
    dog.confidence_level = 'low';
  }

  return dog;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 京都府動物愛護管理センター（犬） - YAML抽出');
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
    $('div.content.clearfix').each((index, content) => {
      const dog = extractDogFromContent($, content, index);
      if (dog) {
        allDogs.push(dog);
        console.log(`   犬 ${index + 1}: ${dog.name} (${dog.gender})`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

    if (allDogs.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

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
          municipality_id: 15, // 京都府動物愛護管理センター
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
