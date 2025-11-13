#!/usr/bin/env node

/**
 * 兵庫県動物愛護センター YAML抽出スクリプト
 *
 * 特徴:
 * - sp-item-gallery構造から猫情報を抽出
 * - 募集期間、品種、性別、年齢を取得
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
  municipality: 'hyogo/hyogo-pref-cats',
  base_url: 'http://www.hyogo-douai.sakura.ne.jp',
  source_url: 'http://www.hyogo-douai.sakura.ne.jp/jyouto4.html',
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

  if (text.includes('オス') || text.includes('おす') || text.includes('雄')) {
    return 'male';
  } else if (text.includes('メス') || text.includes('めす') || text.includes('雌')) {
    return 'female';
  } else {
    return 'unknown';
  }
}

/**
 * ギャラリーアイテムから猫情報を抽出
 */
function extractCatFromGalleryItem($, $item, index) {
  const title = $item.find('.item-gallery-title').text().trim();
  const content = $item.find('.item-gallery-content').text().trim();
  const $img = $item.find('.item-gallery-thumbnail');
  const imgSrc = $img.attr('src');

  // 画像URLを絶対URLに変換
  let imageUrl = null;
  if (imgSrc) {
    if (imgSrc.startsWith('http')) {
      imageUrl = imgSrc;
    } else {
      imageUrl = CONFIG.base_url + '/' + imgSrc;
    }
  }

  // 募集期間から external_id を生成
  const dateMatch = title.match(/(\d+)月(\d+)日/);
  const externalId = dateMatch
    ? `hyogo-${dateMatch[1]}-${dateMatch[2]}-${index}`
    : `hyogo-${index}`;

  // コンテンツから情報を抽出
  const parts = content.split('、').map((s) => s.trim());
  let breed = null;
  let gender = 'unknown';
  let age = null;

  parts.forEach((part) => {
    if (part.includes('雑種') || part.includes('純血')) {
      breed = part;
    } else if (part.includes('オス') || part.includes('メス')) {
      gender = parseGender(part);
    } else if (part.includes('歳') || part.includes('齢')) {
      age = part;
    }
  });

  // 譲渡済み判定
  const status = getAdoptionStatus(content);

  // 動物種判定（デフォルトは猫）
  const animalType = /犬|イヌ|dog/i.test(content) ? 'dog' : 'cat';

  return {
    external_id: externalId,
    name: null, // 名前なし
    animal_type: animalType,
    breed: breed,
    age_estimate: age,
    gender: gender,
    color: null,
    size: null,
    health_status: content.includes('去勢済み')
      ? '去勢済み'
      : content.includes('避妊済み')
        ? '避妊済み'
        : null,
    personality: null,
    special_needs: null,
    images: imageUrl ? [imageUrl] : [],
    protection_date: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [],
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 兵庫県動物愛護センター - YAML抽出');
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

    // Step 2: ギャラリーアイテムを取得
    const $galleryItems = $('.sp-item-gallery .item-gallery-item');

    console.log(`📊 検出した猫数: ${$galleryItems.length}`);

    if ($galleryItems.length === 0) {
      console.warn('⚠️ 猫情報が見つかりませんでした');
      return;
    }

    // Step 3: 各アイテムから猫情報を抽出
    const allCats = [];
    $galleryItems.each((index, item) => {
      console.log(`\n--- 猫 ${index + 1}/${$galleryItems.length} ---`);
      const cat = extractCatFromGalleryItem($, $(item), index + 1);

      console.log(`   ID: ${cat.external_id}`);
      console.log(
        `   品種: ${cat.breed || '不明'}, 性別: ${cat.gender}, 年齢: ${cat.age_estimate || '不明'}`
      );

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
          municipality_id: 11, // 兵庫県動物愛護センター
          total_count: allCats.length,
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
