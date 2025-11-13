#!/usr/bin/env node

/**
 * 福井県動物愛護管理センター YAML抽出スクリプト
 *
 * 特徴:
 * - article要素から猫情報を抽出
 * - 1つのarticleに複数の猫が含まれる可能性あり（管理番号が複数）
 * - <dl class="spec">から詳細情報を取得
 * - YAML形式で出力（人間が確認・修正可能）
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'fukui/fukui-pref-cats',
  base_url: 'https://www.fapscsite.com',
  source_url: 'https://www.fapscsite.com/adoptable_animal/animal_kind/cat/',
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
 * 性別文字列を解析（例: "オス：1匹、メス：1匹" → [{gender: 'male', count: 1}, {gender: 'female', count: 1}]）
 */
function parseGenderString(genderStr) {
  const results = [];

  // パターン1: "オス：1匹、メス：1匹"
  const maleMatch = genderStr.match(/オス[：:]\s*(\d+)\s*匹/);
  const femaleMatch = genderStr.match(/メス[：:]\s*(\d+)\s*匹/);

  if (maleMatch) {
    const count = parseInt(maleMatch[1], 10);
    for (let i = 0; i < count; i++) {
      results.push({ gender: 'male', index: i });
    }
  }

  if (femaleMatch) {
    const count = parseInt(femaleMatch[1], 10);
    for (let i = 0; i < count; i++) {
      results.push({ gender: 'female', index: i });
    }
  }

  // パターン2: 単純な "オス" または "メス"
  if (results.length === 0) {
    if (genderStr.includes('オス')) {
      results.push({ gender: 'male', index: 0 });
    } else if (genderStr.includes('メス')) {
      results.push({ gender: 'female', index: 0 });
    } else {
      results.push({ gender: 'unknown', index: 0 });
    }
  }

  return results;
}

/**
 * 管理番号を解析（例: "HC25378.25379" → ["HC25378", "HC25379"]）
 */
function parseManagementNumbers(title) {
  const match = title.match(/管理番号[：:]\s*([A-Z0-9.]+)/);
  if (!match) {
    return [];
  }

  const idsStr = match[1].split('(')[0]; // 括弧の前まで取得（場所情報を除外）
  const ids = idsStr.split('.').map((id) => id.trim());

  return ids;
}

/**
 * 場所情報を抽出（例: "管理番号：HC25378.25379(松岡上吉野)" → "松岡上吉野"）
 */
function parseLocation(title) {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * <dl>から情報を抽出
 */
function extractSpecsFromDl($, $article) {
  const specs = {};
  const $dl = $article.find('dl.spec');

  $dl.find('dt').each((i, dt) => {
    const $dt = $(dt);
    const $dd = $dt.next('dd');

    if ($dd.length > 0) {
      const key = $dt.text().trim();
      const value = $dd.text().trim();
      specs[key] = value;
    }
  });

  return specs;
}

/**
 * 画像URLを抽出
 */
function extractImages($, $article) {
  const images = [];
  $article.find('.uk-slideshow-items img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      images.push(src);
    }
  });
  return images;
}

/**
 * article要素から猫情報を抽出
 */
function extractCatsFromArticle($, article) {
  const $article = $(article);
  const cats = [];

  // タイトルから管理番号と場所を取得
  const title = $article.find('h2.entry-title').text().trim();
  const managementNumbers = parseManagementNumbers(title);
  const location = parseLocation(title);

  if (managementNumbers.length === 0) {
    console.warn(`⚠️ 管理番号が見つかりません: ${title}`);
    return cats;
  }

  // スペック情報を取得
  const specs = extractSpecsFromDl($, $article);

  // 画像を取得
  const images = extractImages($, $article);

  // 性別情報を解析
  const genderInfo = specs['性別']
    ? parseGenderString(specs['性別'])
    : [{ gender: 'unknown', index: 0 }];

  // 管理番号と性別情報をマッチング
  const totalCats = Math.max(managementNumbers.length, genderInfo.length);

  for (let i = 0; i < totalCats; i++) {
    // 管理番号の割り当て
    let externalId;

    if (managementNumbers.length >= totalCats && managementNumbers[i]) {
      // 管理番号が十分にある場合、そのまま使用
      externalId = managementNumbers[i];
    } else if (managementNumbers.length > 0) {
      // 管理番号が不足している場合、サフィックスで一意化
      // （例: HC25374 + 4匹 → HC25374-1, HC25374-2, HC25374-3, HC25374-4）
      const baseId = managementNumbers[i] || managementNumbers[0];
      externalId = `${baseId}-${i + 1}`;
    } else {
      // 管理番号が全くない場合
      externalId = `fukui_unknown_${Date.now()}_${i}`;
    }

    const gender = genderInfo[i] ? genderInfo[i].gender : 'unknown';

    // 譲渡済み判定（article全体とスペック情報で判定）
    const articleText = $article.text();
    const isAdopted =
      articleText.includes('譲渡済み') ||
      articleText.includes('譲渡しました') ||
      articleText.includes('譲渡決定') ||
      (specs['その他'] && specs['その他'].includes('譲渡済'));

    const cat = {
      external_id: externalId,
      name: null, // 名前情報がないため、後でgenerateDefaultNameで生成される
      breed: specs['品種'] || null,
      age_estimate: specs['年齢'] || null,
      gender: gender,
      color: specs['毛種／毛色'] || specs['毛色'] || null,
      size: specs['体格'] || null,
      health_status: null,
      personality: null,
      special_needs: specs['その他'] || null,
      images: images.length > 0 ? images : [],
      protection_location: specs['収容場所'] || location || null,
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

    cats.push(cat);
  }

  return cats;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 福井県動物愛護管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: article要素を取得
    const articles = $('article.animal-item').toArray();
    console.log(`📊 検出した記事数: ${articles.length}`);

    if (articles.length === 0) {
      console.warn('⚠️ 記事が見つかりませんでした');
      return;
    }

    // Step 3: 各記事から猫情報を抽出
    const allCats = [];
    articles.forEach((article, index) => {
      console.log(`\n--- 記事 ${index + 1}/${articles.length} ---`);
      const cats = extractCatsFromArticle($, article);
      console.log(`   抽出した猫: ${cats.length}匹`);

      cats.forEach((cat, catIndex) => {
        console.log(`   - ${catIndex + 1}. ID: ${cat.external_id}, 性別: ${cat.gender}`);
      });

      allCats.push(...cats);
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
