#!/usr/bin/env node

/**
 * 新潟市動物愛護センター HTML収集スクリプト（猫）
 *
 * URL: https://www.ikutopia.com/facilities/doubutsu/foster/cat/
 * 注: いくとぴあ食花内の動物ふれあいセンターで管理
 */

import { chromium } from 'playwright';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'niigata/niigata-city-cats',
  url: 'https://www.ikutopia.com/facilities/doubutsu/foster/cat/',
  expected_selectors: 'article, .cat-card, a[href*="/cat/"]',
  timeout: 30000,
  waitTime: 3000, // 静的HTMLだが念のため
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱 新潟市動物愛護センター - HTML収集（猫）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   URL: ${CONFIG.url}`);
  console.log('='.repeat(60) + '\n');

  let browser;

  try {
    // Playwrightブラウザ起動
    console.log('🌐 Playwrightブラウザを起動中...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護猫情報収集Bot',
    });

    const page = await context.newPage();

    // ページへアクセス
    console.log(`📄 ページにアクセス中: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    // 少し待機
    console.log(`⏳ ページ読み込み待機中 (${CONFIG.waitTime}ms)...`);
    await page.waitForTimeout(CONFIG.waitTime);

    // HTML取得
    const html = await page.content();
    console.log(`✅ HTML取得完了: ${html.length} 文字`);

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // 保存先ディレクトリ作成
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    // ファイル名生成（タイムスタンプ付き）
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(outputDir, filename);

    // HTML保存
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`💾 HTML保存完了: ${filepath}`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals: html.includes('猫') || html.includes('ネコ') || html.includes('ねこ'),
      html_size: html.length,
      scraper: 'playwright',
      note: 'カード型レイアウト、管理番号（2025k28など）・名前・年齢表示',
    };

    const metadataPath = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`📋 メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTML収集完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    logger.finalize();
  }
}

/**
 * HTML内の動物数をカウント
 * 新潟市（いくとぴあ）は管理番号（2025k28など）で各猫を識別
 */
function countAnimalsInHTML(html) {
  // 管理番号パターン（例：2025k28）を検索
  const pattern = /\d{4}k\d+/g;
  const matches = html.match(pattern);

  if (!matches) {
    console.log('  ⚠️  猫情報が見つかりませんでした');
    return 0;
  }

  // 重複除去
  const uniqueIds = [...new Set(matches)];
  console.log(`  🔍 検出: ${uniqueIds.length}匹`);
  return uniqueIds.length;
}

// 実行
main();
