#!/usr/bin/env node

/**
 * 岡山県動物愛護センター HTMLスクレイピングスクリプト
 * URL: https://www.pref.okayama.jp/page/859555.html
 *
 * 特徴:
 * - 犬猫混在ページ（table形式、セクション別）
 * - 静的HTMLページ
 * - セクション: 保護収容情報（犬）、保護収容情報（猫）
 * - フィールド: 収容日、管理番号、種類、年齢、毛色、性別、体格、特徴、場所、写真
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'okayama/okayama-pref',
  url: 'https://www.pref.okayama.jp/page/859555.html',
  expected_selectors: 'table',
  timeout: 30000,
  waitTime: 5000,
};

async function scrapeWithPlaywright() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐾 岡山県動物愛護センター - HTMLスクレイピング');
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

    // データ存在確認
    const hasData = (await page.locator(CONFIG.expected_selectors).count()) > 0;
    if (!hasData) {
      console.log('⚠️  データが見つかりません');
      logger.addError('データ要素が見つかりません');
    }

    const htmlContent = await page.content();

    const dataDir = path.join(
      process.cwd(),
      'scripts',
      'scrapers',
      'okayama',
      'okayama-pref',
      'data'
    );
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = getJSTISOString().replace(/[:.]/g, '-');
    const filename = `okayama-pref-${timestamp}.html`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, htmlContent, 'utf-8');
    console.log(`\n✅ HTMLを保存: ${filename}`);
    console.log(`   サイズ: ${(htmlContent.length / 1024).toFixed(2)} KB`);

    // latest.htmlリンク作成
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
    logger.addError(error.message);
    logger.finalize();
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeWithPlaywright().catch(console.error);
