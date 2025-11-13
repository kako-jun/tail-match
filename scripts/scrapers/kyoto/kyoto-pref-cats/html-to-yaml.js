#!/usr/bin/env node

/**
 * 京都府動物愛護管理センター YAML抽出スクリプト
 *
 * 特徴:
 * - div.content.clearfix から猫情報を抽出
 * - 譲渡決定済みの猫はスキップ
 * - table.info から詳細情報を取得
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
  municipality: 'kyoto/kyoto-pref-cats',
  base_url: 'https://kyoto-ani-love.com',
  source_url: 'https://kyoto-ani-love.com/recruit-animal/cat/',
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
 * 性別を解析
 */
function parseGender(genderStr) {
  if (!genderStr) return 'unknown';
  if (genderStr.includes('オス') || genderStr.includes('雄')) {
    return 'male';
  } else if (genderStr.includes('メス') || genderStr.includes('雌')) {
    return 'female';
  }
  return 'unknown';
}

/**
 * table.info から情報を抽出
 */
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

/**
 * div.content.clearfix から猫情報を抽出
 */
function extractCatFromContent($, content, index) {
  const $content = $(content);

  // タイトル取得
  const title = $content.find('h2').text().trim();

  // 譲渡決定済みも含めて抽出（statusフィールドで判別）
  // if (title.includes('新しい飼い主さんが決まりました') || title.includes('決まりました')) {
  //   console.log(`  ⏭️  スキップ: ${title} （譲渡決定済み）`);
  //   return null;
  // }

  // 名前を抽出（"センター名：" を除去）
  let name = title.replace(/センター名[：:]/g, '').trim();

  // 括弧内の情報を除去（例: "ししまる（検討中の方がおられます）" → "ししまる"）
  name = name.replace(/[（(].*?[）)]/g, '').trim();

  if (!name) {
    name = `京都猫${index + 1}号`;
  }

  // external_id は名前から生成（タイムスタンプ付き）
  const timestamp = Date.now();
  const external_id = `kyoto_${timestamp}_${index}`;

  // 画像URL取得
  const imageUrl = $content.find('div.image.img-rollover a').attr('href');
  const images = imageUrl ? [imageUrl] : [];

  // テーブル情報取得
  const $table = $content.find('table.info');
  const tableInfo = extractTableInfo($, $table);

  // 性別解析
  const gender = parseGender(tableInfo['性別']);

  // 譲渡済み判定（タイトルとコンテンツ全体のテキストで判定）
  const contentText = $content.text();
  const isAdopted =
    title.includes('新しい飼い主さんが決まりました') ||
    title.includes('決まりました') ||
    contentText.includes('譲渡済み') ||
    contentText.includes('譲渡しました') ||
    contentText.includes('譲渡決定');

  // 猫オブジェクト作成
  const cat = {
    external_id: external_id,
    name: name,
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

  // 画像がない場合は警告
  if (images.length === 0) {
    cat.extraction_notes.push('画像が見つかりませんでした');
    cat.confidence_level = 'medium';
  }

  // テーブル情報がない場合
  if (Object.keys(tableInfo).length === 0) {
    cat.extraction_notes.push('詳細情報テーブルが見つかりませんでした');
    cat.confidence_level = 'low';
  }

  return cat;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 京都府動物愛護管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: div.content.clearfix を取得
    const contents = $('div.content.clearfix').toArray();
    console.log(`📊 検出したコンテンツ数: ${contents.length}`);

    if (contents.length === 0) {
      console.warn('⚠️ コンテンツが見つかりませんでした');
      return;
    }

    // Step 3: 各コンテンツから猫情報を抽出
    const allCats = [];
    contents.forEach((content, index) => {
      console.log(`\n--- コンテンツ ${index + 1}/${contents.length} ---`);
      const cat = extractCatFromContent($, content, index);

      if (cat) {
        console.log(`   ✅ ${cat.name} (${cat.gender})`);
        allCats.push(cat);
      }
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
