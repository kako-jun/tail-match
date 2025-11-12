#!/usr/bin/env node

/**
 * 神奈川県動物愛護センター YAML抽出スクリプト
 *
 * 特徴:
 * - 譲渡動物情報ページから猫情報を抽出
 * - Vue.js動的レンダリング後のHTML解析
 * - YAML形式で出力
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
  municipality: 'kanagawa/kanagawa-pref',
  base_url: 'https://www.pref.kanagawa.jp',
  source_url: 'https://www.pref.kanagawa.jp/osirase/1594/awc/receive/cat.html',
};

// ========================================
// ユーティリティ
// ========================================

/**
 * 最新のHTMLファイル（複数ページ対応）を取得
 */
function getLatestHtmlFiles() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(htmlDir)) {
    throw new Error(`HTMLディレクトリが見つかりません: ${htmlDir}`);
  }

  // 最新のタイムスタンプを取得
  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.match(/_tail(_page\d+)?\.html$/))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('HTMLファイルが見つかりません');
  }

  // 最新のタイムスタンプを抽出
  const latestFile = files[0];
  const timestampMatch = latestFile.match(/^(\d{8}_\d{6})/);
  if (!timestampMatch) {
    throw new Error('タイムスタンプが見つかりません');
  }

  const latestTimestamp = timestampMatch[1];

  // 同じタイムスタンプのページファイルをすべて取得
  const pageFiles = fs
    .readdirSync(htmlDir)
    .filter((f) => f.startsWith(latestTimestamp) && f.includes('_page') && f.endsWith('.html'))
    .sort(); // page1, page2, page3... の順

  if (pageFiles.length > 0) {
    console.log(`   複数ページ検出: ${pageFiles.length}ページ`);
    return pageFiles.map((f) => path.join(htmlDir, f));
  }

  // ページファイルがない場合は単一ファイル
  return [path.join(htmlDir, latestFile)];
}

/**
 * 性別文字列を解析
 */
function parseGender(text) {
  if (!text) return 'unknown';

  text = text.toLowerCase();

  if (
    text.includes('オス') ||
    text.includes('おす') ||
    text.includes('雄') ||
    text.includes('♂')
  ) {
    return 'male';
  } else if (
    text.includes('メス') ||
    text.includes('めす') ||
    text.includes('雌') ||
    text.includes('♀')
  ) {
    return 'female';
  } else {
    return 'unknown';
  }
}

/**
 * サイズ文字列を解析
 */
function parseSize(text) {
  if (!text) return null;

  text = text.toLowerCase();

  if (text.includes('大型') || text.includes('大')) {
    return 'large';
  } else if (text.includes('中型') || text.includes('中')) {
    return 'medium';
  } else if (text.includes('小型') || text.includes('小')) {
    return 'small';
  }

  return null;
}

/**
 * 収容時期から日付を推定（YYYY年MM月 → YYYY-MM-01）
 */
function parseProtectionDate(text) {
  if (!text) return null;

  // "2025年10月" → "2025-10-01"
  const match = text.match(/(\d{4})年(\d{1,2})月/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return `${year}-${month}-01`;
  }

  return null;
}

/**
 * 猫カードから情報を抽出
 */
function extractCatFromCard($, $card, index) {
  // 画像URL
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

  // テーブルからデータ抽出
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

  // 必須フィールド
  const name = data['仮名'] || null;
  const age = data['年齢（収容時）'] || null;
  const protectionPeriod = data['収容時期'] || null;
  const gender = parseGender(data['性別']);
  const breed = data['種別'] || null;
  const color = data['毛色'] || null;
  const size = parseSize(data['体格']);
  const personality = data['性格'] || null;
  const notes = data['備考'] || null;

  // 収容日を推定
  const protectionDate = parseProtectionDate(protectionPeriod);

  // external_idを生成（仮名がない場合はインデックス）
  const externalId = name ? `kanagawa-${name}` : `kanagawa-unknown-${index}`;

  // 譲渡済み判定（カード全体のテキストで判定）
  const cardText = $card.text();
  const isAdopted =
    cardText.includes('譲渡済み') ||
    cardText.includes('譲渡しました') ||
    cardText.includes('譲渡決定');

  return {
    external_id: externalId,
    name: name,
    animal_type: 'cat',
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
    deadline_date: null, // 譲渡猫には期限なし
    status: isAdopted ? 'adopted' : 'available',
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
  console.log('🐱 神奈川県動物愛護センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイル（複数ページ）を読み込み
    const htmlFiles = getLatestHtmlFiles();
    console.log(`📄 HTMLファイル: ${htmlFiles.length}ファイル\n`);

    const allCats = [];
    let totalCards = 0;

    // 各HTMLファイルから猫情報を抽出
    for (let fileIndex = 0; fileIndex < htmlFiles.length; fileIndex++) {
      const htmlFile = htmlFiles[fileIndex];
      console.log(`📄 処理中: ${path.basename(htmlFile)}`);

      const html = fs.readFileSync(htmlFile, 'utf-8');
      const $ = load(html);

      // Step 2: 猫カードを取得
      const $catCards = $('.column.is-one-quarter-desktop');
      totalCards += $catCards.length;

      console.log(`   検出した猫数: ${$catCards.length}`);

      if ($catCards.length === 0) {
        console.warn('   ⚠️ このページに猫情報が見つかりませんでした');
        continue;
      }

      // Step 3: 各カードから猫情報を抽出
      $catCards.each((index, card) => {
        const globalIndex = allCats.length + 1;
        const cat = extractCatFromCard($, $(card), globalIndex);
        allCats.push(cat);
      });

      console.log(`   抽出完了: ${$catCards.length}匹\n`);
    }

    console.log(`📊 合計抽出数: ${allCats.length}匹（全${htmlFiles.length}ページ）`);

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
          municipality_id: 15, // 神奈川県動物愛護センター
          total_count: allCats.length,
          note: '譲渡動物情報（新しい飼い主募集中）',
        },
        animals: allCats,
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

// 実行
main();
