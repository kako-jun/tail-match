#!/usr/bin/env node

/**
 * 那覇市環境衛生課 スクレイピングスクリプト
 * URL: https://www.city.naha.okinawa.jp/kurasitetuduki/animal/902.html
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { getJSTTimestamp } from '../../../lib/timestamp.js';

import { createLogger } from '../../../lib/history-logger.js';
const CONFIG = {
  municipality: 'okinawa/naha-city',
  url: 'https://www.city.naha.okinawa.jp/kurasitetuduki/animal/904.html',
  timeout: 30000,
  userAgent:
    'TailMatchBot/1.0 (+https://github.com/kako-jun/tail-match; scraper for animal adoption information)',
};

async function scrapeNahaCity() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱 那覇市環境衛生課 - スクレイピング開始');
  console.log('='.repeat(60));
  console.log(`   URL: ${CONFIG.url}`);
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
  });
  const page = await context.newPage();

  try {
    console.log('📡 ページにアクセス中...');
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout,
    });

    console.log('⏳ コンテンツの読み込み待機中...');
    await page.waitForTimeout(3000);

    const htmlContent = await page.content();
    console.log(`📄 HTML取得完了: ${htmlContent.length} 文字\n`);

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(htmlContent);
    logger.logHTMLCount(animalCount);
    // HTMLを保存
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const htmlFile = path.join(outputDir, `${timestamp}_tail.html`);
    fs.writeFileSync(htmlFile, htmlContent, 'utf-8');

    // メタデータを保存
    const metadata = {
      scraped_at: new Date().toISOString(),
      url: CONFIG.url,
      html_size: htmlContent.length,
      html_file: htmlFile,
    };

    const metadataFile = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log('✅ HTML保存完了');
    console.log(`   ファイル: ${htmlFile}`);
    console.log(`   サイズ: ${htmlContent.length} bytes\n`);
    console.log('='.repeat(60));
    console.log('✅ スクレイピング完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ スクレイピングエラー');
    console.error('='.repeat(60));
    console.error(error);
    throw error;
    logger.finalize();
  } finally {
    await browser.close();
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

scrapeNahaCity();
