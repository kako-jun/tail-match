#!/usr/bin/env node

/**
 * 神戸市動物管理センター YAML抽出スクリプト
 *
 * 特徴:
 * - 収容犬猫情報ページから猫情報を抽出
 * - 神戸市の標準的な動物情報フォーマット
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
  municipality: 'hyogo/kobe-city',
  base_url: 'https://www.city.kobe.lg.jp',
  source_url: 'https://www.city.kobe.lg.jp/a84140/kenko/health/hygiene/animal/zmenu/index.html',
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
 * 猫情報を抽出（サイト構造に応じて調整が必要）
 */
function extractCatsFromPage($) {
  const allCats = [];

  // 「収容した猫はいません」チェック
  const pageText = $('body').text();
  if (pageText.includes('収容した猫はいません') || pageText.includes('猫はいません')) {
    console.log('⚠️ 現在、収容されている猫はいません');
    return allCats;
  }

  // 実際のHTML構造に基づいて抽出ロジックを実装
  // 例: テーブル形式の場合
  $('table tr').each((i, tr) => {
    const $tr = $(tr);
    const $cells = $tr.find('td');

    if ($cells.length >= 3) {
      // 譲渡済み判定（行全体のテキストで判定）
      const rowText = $tr.text();
      const isAdopted =
        rowText.includes('譲渡済み') ||
        rowText.includes('譲渡しました') ||
        rowText.includes('譲渡決定');

      const cat = {
        external_id: `kobe-${i + 1}`,
        name: $cells.eq(0).text().trim() || null,
        animal_type: 'cat',
        breed: $cells.eq(1).text().trim() || null,
        age_estimate: null,
        gender: parseGender($cells.eq(2).text().trim()),
        color: null,
        size: null,
        health_status: null,
        personality: null,
        special_needs: null,
        images: [],
        protection_date: null,
        status: isAdopted ? 'adopted' : 'available',
        source_url: CONFIG.source_url,
        confidence_level: 'medium',
        extraction_notes: [],
      };

      allCats.push(cat);
    }
  });

  return allCats;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 神戸市動物管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 猫情報を抽出
    const allCats = extractCatsFromPage($);

    console.log(`📊 検出した猫数: ${allCats.length}`);

    if (allCats.length === 0) {
      console.warn('⚠️ 猫情報が見つかりませんでした（現在収容猫なし）');
      return;
    }

    // Step 3: 各猫の情報を表示
    allCats.forEach((cat, index) => {
      console.log(`\n--- 猫 ${index + 1}/${allCats.length} ---`);
      console.log(`   ID: ${cat.external_id}`);
      console.log(
        `   名前: ${cat.name || '不明'}, 品種: ${cat.breed || '不明'}, 性別: ${cat.gender}`
      );
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
          municipality_id: 13, // 神戸市動物管理センター
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
