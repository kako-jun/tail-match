#!/usr/bin/env node

/**
 * 東京都動物愛護相談センター 譲渡動物情報 YAML抽出スクリプト
 *
 * 特徴:
 * - 譲渡動物情報ページから猫情報を抽出
 * - 新しい飼い主募集中の猫
 * - YAML形式で出力
 */

import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'tokyo/tokyo-metro',
  base_url: 'https://shuyojoho.metro.tokyo.lg.jp',
  source_url: 'https://shuyojoho.metro.tokyo.lg.jp/generals',
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
    .filter((f) => f.endsWith('_joto.html'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('譲渡用HTMLファイルが見つかりません');
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

  // 各項目を抽出（一覧ページには名前と管理支所のみ）
  let name = null;
  let office = null;

  $dts.each((i, dt) => {
    const $dt = $(dt);
    const $dd = $dt.next('dd');
    const key = $dt.text().trim();
    const value = $dd.text().trim();

    switch (key) {
      case '名前':
        name = value;
        break;
      case '管理支所':
        office = value;
        break;
    }
  });

  return {
    external_id: managementNumber,
    name: name,
    animal_type: 'cat',
    breed: null, // 詳細ページで確認必要
    age_estimate: null, // 詳細ページで確認必要
    gender: 'unknown', // 詳細ページで確認必要
    color: null, // 詳細ページで確認必要
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: imageUrl ? [imageUrl] : [],
    protection_date: null,
    deadline_date: null, // 譲渡猫には期限なし
    source_url: detailUrl,
    confidence_level: 'medium', // 一覧ページのみ
    extraction_notes: [
      '譲渡動物情報（新しい飼い主募集中）',
      '一覧ページから抽出（詳細情報は個別ページで確認可能）',
      `管理支所: ${office || '不明'}`,
    ],
    listing_type: 'adoption', // 譲渡猫
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 東京都動物愛護相談センター - 譲渡動物YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 猫情報ボックスを取得
    const $catBoxes = $('.topMainBox');

    console.log(`📊 検出した動物数: ${$catBoxes.length}`);

    if ($catBoxes.length === 0) {
      console.warn('⚠️ 譲渡動物情報が見つかりませんでした');
      return;
    }

    // Step 3: 各ボックスから猫情報を抽出
    const allCats = [];
    $catBoxes.each((index, box) => {
      console.log(`\n--- 動物 ${index + 1}/${$catBoxes.length} ---`);
      const cat = extractCatFromBox($, $(box), index + 1);

      console.log(`   管理番号: ${cat.external_id}`);
      console.log(`   品種: ${cat.breed || '不明'}, 性別: ${cat.gender}`);
      console.log(`   収容日: ${cat.protection_date || '不明'}`);

      allCats.push(cat);
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // Step 4: YAML出力
    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

    const outputFile = path.join(outputDir, `${timestamp}_joto.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_joto.html`,
          source_url: CONFIG.source_url,
          extracted_at: new Date().toISOString(),
          municipality: CONFIG.municipality,
          municipality_id: 14, // 東京都動物愛護相談センター
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
