#!/usr/bin/env node

/**
 * 横浜市動物愛護センター 画像からデータ抽出スクリプト
 *
 * 画像内のテキストをClaude Vision APIで読み取り、YAML生成
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

import path from 'path';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';
import { load } from 'cheerio';

const execAsync = promisify(exec);

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'kanagawa/yokohama-city-dogs',
  municipality_id: 16,
  base_url: 'https://www.city.yokohama.lg.jp',
  source_url:
    'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/joto_inu.html',
};

// ========================================
// HTMLから画像URLを抽出
// ========================================

function extractImageUrlsFromHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = load(html);

  const imageUrls = [];

  // 「譲渡動物情報《犬》」セクションの画像のみを取得
  const $section = $('h2:contains("譲渡動物情報《犬》")').first().parent().parent();
  const $nextSection = $('h2:contains("譲渡されました！《犬》")').first().parent().parent();

  let $dogImages;
  if ($nextSection.length > 0) {
    $dogImages = $section.nextUntil($nextSection).find('img[alt*="の犬の写真"]');
  } else {
    $dogImages = $section.nextAll().find('img[alt*="の犬の写真"]');
  }

  $dogImages.each((index, img) => {
    const alt = $(img).attr('alt') || '';
    const src = $(img).attr('src') || '';

    // alt属性から犬のIDを抽出: "193の犬の写真" -> "193"
    const idMatch = alt.match(/(\d+)の犬の写真/);
    if (idMatch && src) {
      const inquiryNumber = idMatch[1];
      imageUrls.push({
        inquiry_number: inquiryNumber,
        url: src,
      });
    }
  });

  return imageUrls;
}

// ========================================
// 画像ダウンロード
// ========================================

async function downloadImage(url, outputPath) {
  // URLが相対パスの場合、ベースURLと結合
  let fullUrl = url;
  if (!url.startsWith('http')) {
    const basePath = CONFIG.source_url.substring(0, CONFIG.source_url.lastIndexOf('/'));
    fullUrl = `${basePath}/${url}`;
  }

  await execAsync(`curl -k -s -o "${outputPath}" "${fullUrl}"`);
  return fs.existsSync(outputPath);
}

// ========================================
// 画像情報の手動解析用テンプレート
// ========================================

function createManualDataTemplate(inquiryNumber, imageUrl, imagePath) {
  // ファイル名から日付を推定
  const filename = path.basename(imagePath);
  const match = filename.match(/jotof(\d{2})(\d{2})(\d{2})\d{2}/);
  let protectionDate = null;
  if (match) {
    const year = `20${match[1]}`;
    const month = match[2];
    const day = match[3];
    protectionDate = `${year}-${month}-${day}`;
  }

  return {
    external_id: `yokohama-${inquiryNumber}`,
    name: `横浜市-${inquiryNumber}`,
    animal_type: 'dog',
    breed: null, // 画像から抽出
    age_estimate: null, // 画像から抽出
    gender: 'unknown', // 画像から抽出
    color: null, // 画像から抽出
    size: null,
    health_status: null, // 画像から抽出
    personality: null, // 画像から抽出
    special_needs: null,
    images: [imagePath.replace(process.cwd() + '/', '')],
    image_url_original: imageUrl,
    protection_date: protectionDate,
    deadline_date: null,
    source_url: CONFIG.source_url,
    confidence_level: 'low',
    extraction_notes: ['画像から情報を抽出する必要があります'],
    needs_review: true,
    inquiry_number: inquiryNumber,
    listing_type: 'adoption',
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 横浜市動物愛護センター（犬）- 画像情報抽出');
  console.log('='.repeat(60));
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    // 最新のHTMLファイルを取得
    const htmlDir = path.join(process.cwd(), 'data', 'html', 'kanagawa', 'yokohama-city');

    const htmlFiles = fs
      .readdirSync(htmlDir)
      .filter((f) => f.endsWith('_tail.html'))
      .sort()
      .reverse();

    if (htmlFiles.length === 0) {
      console.error('❌ HTMLファイルが見つかりません');
      process.exit(1);
    }

    const htmlPath = path.join(htmlDir, htmlFiles[0]);
    console.log(`📄 HTMLファイル: ${path.basename(htmlPath)}\n`);

    // HTMLから画像URLを抽出
    const imageUrls = extractImageUrlsFromHtml(htmlPath);
    console.log(`📊 検出した犬数: ${imageUrls.length}\n`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(imageUrls.length);

    if (imageUrls.length === 0) {
      console.error('❌ 画像URLが見つかりません');
      logger.finalize(); // 空の場合も履歴を保存
      process.exit(1);
    }

    // 画像保存ディレクトリ
    const imageDir = path.join(
      process.cwd(),
      'data',
      'images',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(imageDir, { recursive: true });

    const animals = [];

    // 各画像をダウンロード
    for (let i = 0; i < imageUrls.length; i++) {
      const { inquiry_number, url } = imageUrls[i];
      const imageFilename = path.basename(url);
      const imagePath = path.join(imageDir, imageFilename);

      console.log(`[${i + 1}/${imageUrls.length}] お問合せ番号-${inquiry_number}`);

      // ダウンロード
      console.log(`   ダウンロード中: ${imageFilename}`);
      const success = await downloadImage(url, imagePath);

      if (!success) {
        console.log(`   ❌ ダウンロード失敗`);
        continue;
      }

      const stats = fs.statSync(imagePath);
      console.log(`   ✅ ダウンロード完了: ${(stats.size / 1024).toFixed(1)}KB`);

      // テンプレートデータを作成
      const animalData = createManualDataTemplate(inquiry_number, url, imagePath);
      animals.push(animalData);
    }

    // YAML出力
    console.log(`\n${'='.repeat(60)}`);
    console.log('📝 YAML生成中...');

    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_with_images.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: path.basename(htmlPath),
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: CONFIG.municipality_id,
          total_count: animals.length,
          extraction_type: 'image_download_template',
          note: '画像をダウンロード済み。Claude Vision APIまたは手動でデータを埋める必要があります。',
        },
        confidence_level: 'low',
        consistency_warnings: [
          '画像内の情報を確認する必要があります',
          'お問合せ番号、性別、年齢、毛色、健康状態、性格を画像から読み取ってください',
        ],
        animals: animals,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 動物数: ${animals.length}`);
    console.log(`📁 画像保存先: ${imageDir}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 画像ダウンロード完了');
    console.log('='.repeat(60));
    console.log('\n次のステップ:');
    console.log('  1. data/images/kanagawa/yokohama-city-dogs/ の画像を確認');
    console.log('  2. YAMLファイルに手動で情報を入力');
    console.log('  3. または Claude に画像を見せて情報を抽出してもらう');
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
