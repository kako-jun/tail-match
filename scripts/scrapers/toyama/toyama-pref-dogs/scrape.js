#!/usr/bin/env node

/**
 * 富山県動物管理センター（犬） スクレイパー
 *
 * URL: https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/dog.html
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
  municipality: 'toyama/toyama-pref-dogs',
  url: 'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/dog.html',
  timeout: 30000,
  waitTime: 5000,
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐕 富山県動物管理センター（犬） - HTML収集');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   URL: ${CONFIG.url}`);
  console.log('='.repeat(60) + '\n');

  let browser;

  try {
    console.log('🌐 Playwrightブラウザを起動中...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    console.log(`📄 ページにアクセス中: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout,
    });

    console.log(`⏳ JavaScript実行を待機中 (${CONFIG.waitTime}ms)...`);
    await page.waitForTimeout(CONFIG.waitTime);

    const html = await page.content();
    console.log(`✅ HTML取得完了: ${html.length} 文字`);

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`💾 HTML保存完了: ${filepath}`);

    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals: html.includes('犬') || html.includes('イヌ') || html.includes('いぬ'),
      html_size: html.length,
      scraper: 'playwright',
      note: 'JavaScript実行後の完全レンダリングHTML取得',
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
    logger.finalize();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * HTML内の動物数をカウント（汎用版）
 * 複数のパターンに対応
 */
function countAnimalsInHTML(html) {
  // パターン1: テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    const count = tableRows.length - 1; // ヘッダー行を除外
    if (count > 0) {
      console.log(`  🔍 テーブル行パターンで${count}匹検出`);
      return count;
    }
  }

  // パターン2: カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>/gi,
    /<article[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  🔍 カードパターンで${matches.length}匹検出`);
      return matches.length;
    }
  }

  // パターン3: 詳細ページへのリンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const linkMatches = html.match(linkPattern);
  if (linkMatches && linkMatches.length > 0) {
    console.log(`  🔍 詳細リンクパターンで${linkMatches.length}匹検出`);
    return linkMatches.length;
  }

  // パターン4: 動物名が含まれる要素をカウント（フォールバック）
  const animalKeywords = ['猫', 'ネコ', 'ねこ', '犬', 'イヌ', 'いぬ'];
  let maxCount = 0;
  for (const keyword of animalKeywords) {
    const regex = new RegExp(`<h[2-4][^>]*>.*?${keyword}.*?</h[2-4]>`, 'gi');
    const matches = html.match(regex);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
    }
  }

  if (maxCount > 0) {
    console.log(`  🔍 見出しパターンで${maxCount}匹検出`);
    return maxCount;
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

main();
