#!/usr/bin/env node

/**
 * 堺市動物指導センター YAML抽出スクリプト
 *
 * 特徴:
 * - 犬の情報は画像ファイル（PNG）で掲載
 * - 画像URLのみを抽出し、後でOCR処理が必要
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
  municipality: 'osaka/sakai-city-dogs',
  base_url: 'https://www.city.sakai.lg.jp',
  source_url: 'https://www.city.sakai.lg.jp/kurashi/dobutsu/dogdog/inunekojoto/dogs1.html',
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
 * 画像URLから犬情報を抽出
 * 注: 堺市は画像にテキストが埋め込まれているため、
 * ここではexternal_idとして画像ファイル名を使用
 */
function extractCatFromImage(imageUrl, index) {
  // 画像ファイル名を抽出 (例: "R7_1.png" → "R7_1")
  const filename = path.basename(imageUrl, path.extname(imageUrl));

  // 譲渡済み判定（画像URLやファイル名で判定）
  const isAdopted =
    imageUrl.includes('譲渡済み') ||
    imageUrl.includes('譲渡しました') ||
    imageUrl.includes('譲渡決定') ||
    filename.includes('譲渡済');

  return {
    external_id: filename,
    name: `堺市_${filename}`, // 仮の名前
    animal_type: 'dog',
    breed: null,
    age_estimate: null,
    gender: 'unknown',
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: [imageUrl],
    protection_lodogion: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'low', // 画像のみのため信頼度は低い
    extraction_notes: [
      '画像ファイルから情報を抽出する必要があります',
      'OCR処理または手動確認が必要です',
    ],
    needs_review: true, // レビュー必須フラグ
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 堺市動物指導センター - YAML抽出');
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

    // Step 2: 画像URLを抽出
    const images = [];
    $('div.img-area img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && src.includes('dogs') && src.endsWith('.png')) {
        // 相対URLを絶対URLに変換
        let fullUrl = src;
        if (src.startsWith('./')) {
          // 相対パスを解決
          const basePath = CONFIG.source_url.substring(0, CONFIG.source_url.lastIndexOf('/'));
          fullUrl = basePath + '/' + src.substring(2);
        } else if (src.startsWith('/')) {
          fullUrl = CONFIG.base_url + src;
        } else if (!src.startsWith('http')) {
          // 相対パス（プレフィックスなし）
          const basePath = CONFIG.source_url.substring(0, CONFIG.source_url.lastIndexOf('/'));
          fullUrl = basePath + '/' + src;
        }
        images.push(fullUrl);
      }
    });

    console.log(`📊 検出した画像数: ${images.length}`);

    if (images.length === 0) {
      console.warn('⚠️ 犬情報の画像が見つかりませんでした');
      return;
    }

    // Step 3: 各画像から犬情報を生成
    const allCats = [];
    images.forEach((imageUrl, index) => {
      console.log(`\n--- 画像 ${index + 1}/${images.length} ---`);
      console.log(`   URL: ${imageUrl}`);

      const dog = extractCatFromImage(imageUrl, index);
      allCats.push(dog);
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allCats.length);
    console.log(`⚠️  注意: 詳細情報は画像内にあるため、OCR処理が必要です`);

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
          municipality_id: 'osaka_27_sakai',
          total_count: allCats.length,
          extraction_type: 'image_only',
          note: '堺市は犬情報を画像ファイルで掲載しているため、詳細情報の抽出にはOCR処理が必要です',
        },
        confidence_level: 'critical', // 画像のみのため信頼度CRITICAL
        consistency_warnings: [
          '全ての犬情報が画像ファイルにのみ存在します',
          'OCR処理または手動確認が必須です',
          'データベース投入前に必ず内容を確認してください',
        ],
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了（要レビュー）');
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
