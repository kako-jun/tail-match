#!/usr/bin/env node

/**
 * さいたま市動物愛護ふれあいセンター YAML抽出スクリプト
 *
 * 特徴:
 * - 譲渡猫情報ページから猫情報を抽出
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
  municipality: 'saitama/saitama-city',
  municipalityId: 16, // さいたま市動物愛護ふれあいセンター
  base_url: 'https://www.city.saitama.jp',
  source_url: 'https://www.city.saitama.jp/008/004/003/005/jyoutonekonosyoukai.html',
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
 * 猫情報テーブルから情報を抽出
 */
function extractCatFromRow($, $row, index) {
  const $cells = $row.find('td');

  if ($cells.length < 4) {
    return null; // ヘッダー行などをスキップ
  }

  // 名前
  const name = $cells.eq(0).text().trim();

  // 画像URL
  const images = [];
  $cells
    .eq(1)
    .find('a')
    .each((i, link) => {
      const href = $(link).attr('href');
      if ((href && href.endsWith('.jpg')) || href.endsWith('.jpeg')) {
        const fullUrl = href.startsWith('http')
          ? href
          : CONFIG.base_url + '/008/004/003/005/' + href;
        images.push(fullUrl);
      }
    });
  $cells
    .eq(2)
    .find('a')
    .each((i, link) => {
      const href = $(link).attr('href');
      if (href && (href.endsWith('.jpg') || href.endsWith('.jpeg'))) {
        const fullUrl = href.startsWith('http')
          ? href
          : CONFIG.base_url + '/008/004/003/005/' + href;
        images.push(fullUrl);
      }
    });

  // 詳細情報（性別、年齢、毛色、特徴）
  const detailText = $cells.eq(3).html() || '';
  const details = detailText.split('<br>').map((d) => d.trim());

  let gender = 'unknown';
  let age_estimate = null;
  let color = null;
  let personality = null;

  details.forEach((detail) => {
    if (detail.startsWith('1')) {
      const genderText = detail.replace('1', '').trim();
      if (genderText.includes('オス') || genderText.includes('去勢オス')) {
        gender = 'male';
      } else if (genderText.includes('メス') || genderText.includes('避妊メス')) {
        gender = 'female';
      }
    } else if (detail.startsWith('2')) {
      age_estimate = detail.replace('2', '').trim();
    } else if (detail.startsWith('3')) {
      color = detail.replace('3', '').trim();
    } else if (detail.startsWith('4')) {
      personality = detail.replace('4', '').trim();
    }
  });

  // 譲渡済み判定（詳細情報テキストで判定）
  const isAdopted =
    detailText.includes('譲渡済み') ||
    detailText.includes('譲渡しました') ||
    detailText.includes('譲渡決定');

  return {
    external_id: `saitama-city-${index}`,
    name: name,
    animal_type: 'cat',
    breed: null,
    age_estimate: age_estimate,
    gender: gender,
    color: color,
    size: null,
    health_status: null,
    personality: personality,
    special_needs: null,
    images: images,
    protection_date: null,
    deadline_date: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡猫情報', `名前: ${name}`],
    listing_type: 'adoption',
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 さいたま市動物愛護ふれあいセンター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: テーブルから猫情報を抽出
    const allCats = [];
    const $table = $('table').first(); // 最初のテーブル
    const $rows = $table.find('tbody tr');

    console.log(`📊 検出した行数: ${$rows.length}`);

    $rows.each((index, row) => {
      const $row = $(row);
      const cat = extractCatFromRow($, $row, index + 1);

      if (cat && cat.name && cat.name.length > 0 && cat.name !== '名前') {
        allCats.push(cat);
        console.log(`\n--- 猫 ${allCats.length} ---`);
        console.log(`   名前: ${cat.name}`);
        console.log(`   性別: ${cat.gender}`);
        console.log(`   年齢: ${cat.age_estimate || '不明'}`);
        console.log(`   毛色: ${cat.color || '不明'}`);
        console.log(`   画像数: ${cat.images.length}`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // Step 3: YAML出力
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
          source_file: path.basename(htmlFile),
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: CONFIG.municipalityId,
          total_count: allCats.length,
          note: '譲渡猫情報（新しい飼い主募集中）',
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
