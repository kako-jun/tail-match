#!/usr/bin/env node

/**
 * 大阪府動物愛護管理センター YAML抽出スクリプト
 *
 * 特徴:
 * - table要素から猫情報を抽出
 * - 管理番号、性別、毛色、年齢などを取得
 * - YAML形式で出力（人間が確認・修正可能）
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
  municipality: 'osaka/osaka-pref',
  base_url: 'https://www.pref.osaka.lg.jp',
  source_url: 'https://www.pref.osaka.lg.jp/o120200/doaicenter/doaicenter/jyoutoneko.html',
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
 * 性別文字列を解析
 */
function parseGender(genderStr) {
  if (!genderStr) return 'unknown';

  genderStr = genderStr.trim();

  if (genderStr.includes('去勢オス') || genderStr.includes('オス')) {
    return 'male';
  } else if (genderStr.includes('避妊メス') || genderStr.includes('メス')) {
    return 'female';
  } else {
    return 'unknown';
  }
}

/**
 * 画像URLを抽出
 */
function extractImages($, $cell) {
  const images = [];

  // すべてのimg要素から画像URLを取得
  $cell.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      // 相対URLを絶対URLに変換
      let fullUrl = src;
      if (src.startsWith('/')) {
        fullUrl = CONFIG.base_url + src;
      }
      images.push(fullUrl);
    }
  });

  return images;
}

/**
 * table要素から猫情報を抽出
 */
function extractCatFromTable($, table, index) {
  const $table = $(table);

  // 各行からデータを取得
  let managementNumber = null;
  let color = null;
  let gender = null;
  let age = null;
  let weight = null;
  let personality = null;
  let photoDate = null;
  let images = [];

  $table.find('tr').each((i, tr) => {
    const $tr = $(tr);
    const $th = $tr.find('th');

    // thがある場合のみ処理（データ行）
    if ($th.length > 0) {
      const header = $th.text().trim();

      // thの次のtdを取得
      const $td = $th.next('td');
      const value = $td.text().trim();

      switch (header) {
        case '管理番号':
          // "5-2-44\n(32366)" のような形式から "5-2-44" を抽出
          managementNumber = value.split('\n')[0].trim();
          break;
        case '毛色':
          color = value;
          break;
        case '性別':
          gender = parseGender(value);
          break;
        case '推定年齢':
          age = value;
          break;
        case '体重':
          weight = value;
          break;
        case 'アピールポイント':
          personality = value;
          break;
        case '撮影年月日':
          photoDate = value;
          break;
      }
    }

    // 最初の行の画像列から画像を取得
    if (i === 0) {
      const $imageCell = $tr.find('td').first();
      if ($imageCell.length > 0) {
        images = extractImages($, $imageCell);
      }
    }
  });

  // external_id は管理番号をそのまま使用
  let external_id;
  if (managementNumber) {
    // "5-2-44" のような形式をそのまま使用
    external_id = managementNumber.replace(/\s/g, ''); // 空白を除去
  } else {
    external_id = `osaka_unknown_${Date.now()}_${index}`;
  }

  // 譲渡済み判定（テーブル全体のテキストで判定）
  const tableText = $table.text();
  const isAdopted =
    tableText.includes('譲渡済み') ||
    tableText.includes('譲渡しました') ||
    tableText.includes('譲渡決定');

  const cat = {
    external_id: external_id,
    name: null, // 名前情報がないため、後でgenerateDefaultNameで生成される
    breed: null, // 品種情報がない
    age_estimate: age,
    gender: gender,
    color: color,
    size: weight || null,
    health_status: null,
    personality: personality,
    special_needs: null,
    images: images.length > 0 ? images : [],
    protection_location: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [],
  };

  // 画像がない場合は警告
  if (images.length === 0) {
    cat.extraction_notes.push('画像が見つかりませんでした');
    cat.confidence_level = 'medium';
  }

  // 必須情報のチェック
  if (!cat.external_id) {
    cat.extraction_notes.push('管理番号が取得できませんでした');
    cat.confidence_level = 'low';
  }

  if (!cat.gender || cat.gender === 'unknown') {
    cat.extraction_notes.push('性別情報が不明確です');
    cat.confidence_level = 'medium';
  }

  return cat;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 大阪府動物愛護管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: table要素を取得
    const tables = $('table.datatable').toArray();
    console.log(`📊 検出したテーブル数: ${tables.length}`);

    if (tables.length === 0) {
      console.warn('⚠️ テーブルが見つかりませんでした');
      return;
    }

    // Step 3: 各テーブルから猫情報を抽出
    const allCats = [];
    tables.forEach((table, index) => {
      console.log(`\n--- テーブル ${index + 1}/${tables.length} ---`);
      const cat = extractCatFromTable($, table, index);
      console.log(
        `   ID: ${cat.external_id}, 性別: ${cat.gender}, 毛色: ${cat.color || 'unknown'}`
      );

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

    const timestamp = getJSTTimestamp();

    const outputFile = path.join(outputDir, `${timestamp}_tail.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          total_count: allCats.length,
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
