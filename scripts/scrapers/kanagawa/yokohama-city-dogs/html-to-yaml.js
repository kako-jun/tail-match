#!/usr/bin/env node

/**
 * 横浜市動物愛護センター YAML抽出スクリプト
 *
 * 特徴:
 * - 画像ベースのシンプルな表示
 * - 詳細情報は電話問い合わせのみ
 * - ID番号と画像URLのみ取得可能
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
  municipality: 'kanagawa/yokohama-city-dogs',
  base_url: 'https://www.city.yokohama.lg.jp',
  source_url:
    'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/joto_inu.html',
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
 * 画像ファイル名から日付を推定
 */
function parseProtectionDateFromFilename(filename) {
  // ファイル名: 134jotof25101501.jpg -> 2025-10-15
  const match = filename.match(/jotof(\d{2})(\d{2})(\d{2})\d{2}/);
  if (match) {
    const year = `20${match[1]}`;
    const month = match[2];
    const day = match[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * 画像タグから猫情報を抽出
 */
function extractCatFromImage($img) {
  const alt = $img.attr('alt') || '';
  const src = $img.attr('src') || '';

  // alt属性から犬のIDを抽出: "134の犬の写真" -> "134"
  const idMatch = alt.match(/(\d+)の犬の写真/);
  if (!idMatch) {
    return null;
  }

  const externalId = `yokohama-${idMatch[1]}`;
  const inquiryNumber = idMatch[1];

  // 画像URLを生成
  let imageUrl = src;
  if (src && !src.startsWith('http')) {
    // 相対パスの場合、ベースURLと結合
    const basePath = CONFIG.source_url.substring(0, CONFIG.source_url.lastIndexOf('/'));
    imageUrl = `${basePath}/${src}`;
  }

  // ファイル名から日付を推定
  const filename = path.basename(src);
  const protectionDate = parseProtectionDateFromFilename(filename);

  // 譲渡済み判定（alt属性で判定）
  const status = getAdoptionStatus(alt);

  return {
    external_id: externalId,
    name: `横浜市-${inquiryNumber}`,
    animal_type: 'dog',
    breed: null,
    age_estimate: null,
    gender: 'unknown',
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: '詳細は横浜市動物愛護センターへお問い合わせください',
    images: imageUrl ? [imageUrl] : [],
    protection_date: protectionDate,
    deadline_date: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'medium',
    extraction_notes: [
      '譲渡動物情報（新しい飼い主募集中）',
      `お問合せ番号: ${inquiryNumber}`,
      '詳細情報は電話問い合わせのみ（045-471-2111）',
    ],
    listing_type: 'adoption',
    inquiry_number: inquiryNumber,
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 横浜市動物愛護センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${path.basename(htmlFile)}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 犬の画像を取得（「譲渡動物情報《犬》」セクションのみ）
    // 「譲渡されました！」セクションより前の画像のみを取得
    const $section = $('h2:contains("譲渡動物情報《犬》")').first().parent().parent();
    const $nextSection = $('h2:contains("譲渡されました")').first().parent().parent();

    // セクション内の画像を取得
    let $dogImages;
    if ($nextSection.length > 0) {
      // 「譲渡されました！」セクションより前の画像
      $dogImages = $section.nextUntil($nextSection).find('img[alt*="の犬の写真"]');
    } else {
      // 「譲渡されました！」セクションが見つからない場合は、セクション以降のすべての画像
      $dogImages = $section.nextAll().find('img[alt*="の犬の写真"]');
    }

    console.log(`📊 検出した犬数: ${$dogImages.length}\n`);

    if ($dogImages.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      process.exit(1);
    }

    // Step 3: 各画像から犬情報を抽出
    const allDogs = [];
    $dogImages.each((index, img) => {
      const dog = extractCatFromImage($(img));
      if (dog) {
        allDogs.push(dog);
        console.log(
          `   ${index + 1}. お問合せ番号-${dog.inquiry_number} (${dog.protection_date || '日付不明'})`
        );
      }
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

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
          municipality_id: 16, // 横浜市動物愛護センター
          total_count: allDogs.length,
          note: '譲渡動物情報（新しい飼い主募集中）- 詳細は電話問い合わせ必須',
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

// 実行
main();
