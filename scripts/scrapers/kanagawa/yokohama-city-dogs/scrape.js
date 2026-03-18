#!/usr/bin/env node

/**
 * 横浜市動物愛護センター スクレイピングスクリプト
 *
 * 特徴:
 * - 静的HTMLページ
 * - 画像ベースのリスト表示
 * - ページネーションなし
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import { createLogger } from '../../../lib/history-logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 設定
// ========================================

const CONFIG = {
  url: 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/joto_inu.html',
  municipality: 'kanagawa/yokohama-city-dogs',
  outputDir: path.join(process.cwd(), 'data', 'html', 'kanagawa', 'yokohama-city-dogs'),
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐕 横浜市動物愛護センター（犬）- スクレイピング');
  console.log('='.repeat(60));
  console.log(`   URL: ${CONFIG.url}`);
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  // 出力ディレクトリ作成
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  // Playwright起動
  console.log('🌐 ブラウザ起動中...\n');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
  });

  const page = await context.newPage();

  try {
    // ページにアクセス
    console.log(`📡 ページにアクセス中: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });

    // ページ読み込み完了を待つ
    await page.waitForTimeout(2000);

    console.log('✅ ページ読み込み完了\n');

    // HTMLを取得
    const html = await page.content();

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // タイムスタンプ生成（日本時間）
    const timestamp = getJSTTimestamp();

    // HTMLを保存
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, html, 'utf-8');

    console.log(`💾 HTML保存: ${filepath}`);
    console.log(`📊 ファイルサイズ: ${html.length} bytes`);

    // メタデータを保存
    const metadata = {
      url: CONFIG.url,
      timestamp: timestamp,
      municipality: CONFIG.municipality,
      filename: filename,
      size: html.length,
      scraped_at: getJSTISOString(),
    };

    const metadataPath = path.join(CONFIG.outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`📝 メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ スクレイピング完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
    logger.finalize();
  } finally {
    await browser.close();
  }
}

/**
 * HTML内の動物数をカウント
 */
function countAnimalsInHTML(html) {
  // テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    // ヘッダー行を除外
    const count = tableRows.length - 1;
    console.log(`  🔍 テーブル行パターンで${count}匹検出`);
    return count > 0 ? count : 0;
  }

  // カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  🔍 カードパターンで${matches.length}匹検出`);
      return matches.length;
    }
  }

  // 詳細ページへのリンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const matches = html.match(linkPattern);
  if (matches) {
    console.log(`  🔍 詳細リンクパターンで${matches.length}匹検出`);
    return matches.length;
  }

  // 画像タグをカウント（汎用フォールバック）
  const imgPattern = /<img[^>]*src="[^"]*"[^>]*>/gi;
  const allImages = html.match(imgPattern);
  if (allImages) {
    // アイコンや装飾画像を除外
    const animalImages = allImages.filter(
      (img) => !img.includes('icon') && !img.includes('logo') && !img.includes('button')
    );
    if (animalImages.length > 0) {
      console.log(`  🔍 画像パターンで${animalImages.length}匹検出`);
      return animalImages.length;
    }
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
