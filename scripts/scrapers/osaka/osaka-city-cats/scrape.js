#!/usr/bin/env node

/**
 * 大阪市動物管理センター HTML収集スクリプト
 *
 * URL: https://www.city.osaka.lg.jp/kenkofukushi/page/0000370215.html
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import { createLogger } from '../../../lib/history-logger.js';
import path from 'path';
import { chromium } from 'playwright';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'osaka/osaka-city-cats',
  url: 'https://www.city.osaka.lg.jp/kenko/page/0000206027.html',
  expected_selectors: 'div.content, table, article',
  timeout: 30000,
  waitTime: 3000,
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🌐 大阪市動物管理センター - HTML取得');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   URL: ${CONFIG.url}`);
  console.log('='.repeat(60) + '\n');

  let browser;
  try {
    // Playwright起動
    console.log('🚀 Playwrightブラウザ起動中...\n');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // ページ読み込み
    console.log('📄 ページ読み込み中...\n');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });

    // JavaScript実行完了まで待機
    await page.waitForTimeout(CONFIG.waitTime);

    // HTML取得
    const html = await page.content();
    console.log(`📊 HTML取得完了: ${html.length}文字\n`);

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);
    // 保存先ディレクトリ
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(outputDir, { recursive: true });

    // タイムスタンプ付きファイル名
    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_tail.html`);

    // HTML保存
    fs.writeFileSync(outputFile, html, 'utf-8');
    console.log(`✅ HTML保存完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals: html.includes('猫') || html.includes('ネコ'),
      html_size: html.length,
      scraper: 'playwright',
      note: 'JavaScript実行後の完全レンダリングHTML取得',
    };

    const metadataFile = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✅ メタデータ保存: ${metadataFile}\n`);

    console.log('='.repeat(60));
    console.log('✅ HTML取得完了');
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
    if (browser) {
      await browser.close();
    }
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
