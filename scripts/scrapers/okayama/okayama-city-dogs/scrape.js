#!/usr/bin/env node

/**
 * 岡山市保健所 犬用 HTMLスクレイピングスクリプト
 * URL: https://www.city.okayama.jp/kurashi/0000016441.html
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'okayama/okayama-city-dogs',
  url: 'https://www.city.okayama.jp/kurashi/0000016441.html',
  expected_selectors: 'h3',
  timeout: 30000,
  waitTime: 5000,
};

async function scrapeWithPlaywright() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐾 岡山市保健所（犬） - HTMLスクレイピング');
  console.log('='.repeat(60) + '\n');

  let browser;
  try {
    console.log(`📍 URL: ${CONFIG.url}`);
    console.log(`⏱️  開始時刻: ${getJSTTimestamp()}\n`);

    browser = await chromium.launch({
      headless: true,
      timeout: CONFIG.timeout,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    console.log('🌐 ページにアクセス中...');
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });

    console.log(`⏳ コンテンツ読み込み待機 (${CONFIG.waitTime}ms)...`);
    await page.waitForTimeout(CONFIG.waitTime);

    const htmlContent = await page.content();

    const dataDir = path.join(
      process.cwd(),
      'scripts',
      'scrapers',
      'okayama',
      'okayama-city-dogs',
      'data'
    );
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = getJSTISOString().replace(/[:.]/g, '-');
    const filename = `okayama-city-dogs-${timestamp}.html`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, htmlContent, 'utf-8');
    console.log(`\n✅ HTMLを保存: ${filename}`);
    console.log(`   サイズ: ${(htmlContent.length / 1024).toFixed(2)} KB`);

    const latestLink = path.join(dataDir, 'latest.html');
    if (fs.existsSync(latestLink)) {
      fs.unlinkSync(latestLink);
    }
    fs.symlinkSync(filename, latestLink);
    console.log(`   latest.html -> ${filename}`);

    logger.finalize();
    console.log(`\n⏱️  終了時刻: ${getJSTTimestamp()}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    logger.logError(error);
    logger.finalize();
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeWithPlaywright().catch(console.error);
