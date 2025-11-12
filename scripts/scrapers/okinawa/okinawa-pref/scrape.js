#!/usr/bin/env node

/**
 * 沖縄県動物愛護管理センター スクレイピングスクリプト
 * URL: https://www.aniwel-pref.okinawa/animals/transfer/cats
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { getJSTTimestamp } from '../../../lib/timestamp.js';

const CONFIG = {
  municipality: 'okinawa/okinawa-pref',
  url: 'https://www.aniwel-pref.okinawa/animals/transfer/cats',
  timeout: 30000,
  userAgent:
    'TailMatchBot/1.0 (+https://github.com/kako-jun/tail-match; scraper for animal adoption information)',
};

async function scrapeOkinawaPref() {
  console.log('='.repeat(60));
  console.log('🐱 沖縄県動物愛護管理センター - スクレイピング開始');
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
    console.error('\n' + '='.repeat(60));
    console.error('❌ スクレイピングエラー');
    console.error('='.repeat(60));
    console.error(error);
    throw error;
  } finally {
    await browser.close();
  }
}

scrapeOkinawaPref();
