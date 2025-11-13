#!/usr/bin/env node

/**
 * 神奈川県動物愛護センター（犬） YAML抽出スクリプト
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
  municipality: 'kanagawa/kanagawa-pref-dogs',
  base_url: 'https://www.pref.kanagawa.jp',
  source_url: 'https://www.pref.kanagawa.jp/osirase/1594/awc/receive/dog.html',
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

function parseSize(text) {
  if (!text) return null;
  text = text.toLowerCase();
  if (text.includes('大型') || text.includes('大')) return 'large';
  if (text.includes('中型') || text.includes('中')) return 'medium';
  if (text.includes('小型') || text.includes('小')) return 'small';
  return null;
}

function parseProtectionDate(text) {
  if (!text) return null;
  const match = text.match(/(\d{4})年(\d{1,2})月/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return `${year}-${month}-01`;
  }
  return null;
}

function extractDogFromCard($, $card, index) {
  const $img = $card.find('.card-image img');
  const imgSrc = $img.attr('src');
  let imageUrl = null;
  if (imgSrc) {
    if (imgSrc.startsWith('http')) {
      imageUrl = imgSrc;
    } else {
      imageUrl = CONFIG.base_url + imgSrc;
    }
  }

  const $rows = $card.find('table tr');
  const data = {};

  $rows.each((i, row) => {
    const $row = $(row);
    const $th = $row.find('th');
    const $td = $row.find('td');

    if ($th.length && $td.length) {
      const key = $th.text().trim();
      const value = $td.text().trim();
      data[key] = value;
    }
  });

  const name = data['仮名'] || null;
  const age = data['年齢（収容時）'] || null;
  const protectionPeriod = data['収容時期'] || null;
  const gender = parseGender(data['性別']);
  const breed = data['種別'] || null;
  const color = data['毛色'] || null;
  const size = parseSize(data['体格']);
  const personality = data['性格'] || null;
  const notes = data['備考'] || null;

  const protectionDate = parseProtectionDate(protectionPeriod);

  const externalId = name ? `kanagawa-dog-${name}` : `kanagawa-dog-unknown-${index}`;

  const cardText = $card.text();
  const status = getAdoptionStatus(cardText);

  return {
    external_id: externalId,
    name: name,
    animal_type: 'dog',
    breed: breed,
    age_estimate: age,
    gender: gender,
    color: color,
    size: size,
    health_status: null,
    personality: personality,
    special_needs: notes,
    images: imageUrl ? [imageUrl] : [],
    protection_date: protectionDate,
    deadline_date: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [
      '譲渡動物情報（新しい飼い主募集中）',
      `収容時期: ${protectionPeriod || '不明'}`,
    ],
    listing_type: 'adoption',
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 神奈川県動物愛護センター（犬） - YAML抽出');
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

    const $cards = $('.card, .animal-card, article');
    console.log(`📊 検出したカード数: ${$cards.length}`);

    if ($cards.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

    const allDogs = [];
    $cards.each((index, card) => {
      const dog = extractDogFromCard($, $(card), index);
      if (dog.external_id) {
        allDogs.push(dog);
        console.log(`   犬 ${index + 1}: ${dog.name || '名前不明'} (${dog.gender})`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

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
          municipality_id: 8, // 神奈川県動物愛護センター
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
