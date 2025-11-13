#!/usr/bin/env node

/**
 * 東京都動物愛護相談センター YAML抽出スクリプト
 *
 * 特徴:
 * - 収容動物情報ページから猫情報を抽出
 * - 迷子猫情報（飼い主探し用）
 * - YAML形式で出力
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
  municipality: 'tokyo/tokyo-metro-cats',
  base_url: 'https://shuyojoho.metro.tokyo.lg.jp',
  source_url: 'https://shuyojoho.metro.tokyo.lg.jp/cat',
};

// ========================================
// ユーティリティ
// ========================================

/**
 * 最新のHTMLファイルを取得
 */
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

/**
 * 日付文字列をISO形式に変換
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // "2025年11月10日" → "2025-11-10"
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * 猫情報ボックスから情報を抽出
 */
function extractCatFromBox($, $box, index) {
  const $img = $box.find('.imgWrapper img');
  const $h2 = $box.find('.imgWrapper h2');
  const $dts = $box.find('dt');
  const $dds = $box.find('dd');

  // 管理番号
  const managementNumber = $h2.text().trim().replace('管理番号', '').replace('詳細', '').trim();

  // 画像URL
  const imgSrc = $img.attr('src');
  let imageUrl = null;
  if (imgSrc) {
    if (imgSrc.startsWith('http')) {
      imageUrl = imgSrc;
    } else {
      imageUrl = CONFIG.base_url + imgSrc;
    }
  }

  // 詳細ページURL
  const detailHref = $box.find('.imgWrapper a').attr('href');
  let detailUrl = CONFIG.source_url;
  if (detailHref) {
    if (detailHref.startsWith('http')) {
      detailUrl = detailHref;
    } else {
      detailUrl = CONFIG.base_url + detailHref;
    }
  }

  // 各項目を抽出
  let protectionDate = null;
  let deadlineDate = null;
  let location = null;
  let office = null;

  $dts.each((i, dt) => {
    const $dt = $(dt);
    const $dd = $dt.next('dd');
    const key = $dt.text().trim();
    const value = $dd.text().trim();

    switch (key) {
      case '収容日':
        protectionDate = parseDate(value);
        break;
      case '収容期限':
        deadlineDate = parseDate(value);
        break;
      case '収容場所':
        location = value;
        break;
      case '管理支所':
        office = value;
        break;
    }
  });

  // 譲渡済み判定（ボックス全体のテキストで判定）
  const boxText = $box.text();
  const status = getAdoptionStatus(boxText);

  return {
    external_id: managementNumber,
    name: null, // 迷子猫のため名前なし
    animal_type: 'cat',
    breed: null,
    age_estimate: null,
    gender: 'unknown',
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: imageUrl ? [imageUrl] : [],
    protection_date: protectionDate,
    deadline_date: deadlineDate,
    status: status,
    source_url: detailUrl,
    confidence_level: 'high',
    extraction_notes: [
      '収容動物情報（迷子猫）',
      `収容場所: ${location || '不明'}`,
      `管理支所: ${office || '不明'}`,
    ],
    listing_type: 'lost_pet', // 迷子猫
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 東京都動物愛護相談センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 猫情報ボックスを取得
    const $catBoxes = $('.topMainBox');

    console.log(`📊 検出した猫数: ${$catBoxes.length}`);

    if ($catBoxes.length === 0) {
      console.warn('⚠️ 猫情報が見つかりませんでした');
      return;
    }

    // Step 3: 各ボックスから猫情報を抽出
    const allCats = [];
    $catBoxes.each((index, box) => {
      console.log(`\n--- 猫 ${index + 1}/${$catBoxes.length} ---`);
      const cat = extractCatFromBox($, $(box), index + 1);

      console.log(`   管理番号: ${cat.external_id}`);
      console.log(`   収容日: ${cat.protection_date || '不明'}`);
      console.log(`   収容期限: ${cat.deadline_date || '不明'}`);

      allCats.push(cat);
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allCats.length);

    // Step 4: YAML出力
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
          municipality_id: 14, // 東京都動物愛護相談センター
          total_count: allCats.length,
          note: '収容動物情報（迷子猫、飼い主探し用）',
        },
        animals: allCats,
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

// 実行
main();
