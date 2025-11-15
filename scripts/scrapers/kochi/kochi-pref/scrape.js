#!/usr/bin/env node

/**
 * 高知県中央・中村小動物管理センター HTMLスクレイピングスクリプト
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'kochi/kochi-pref',
  url: 'https://kochi-apc.com/jouto/',
  expected_selectors: '.vkfs-post-card',
  timeout: 30000,
  waitTime: 5000,
};

async function scrapeWithPlaywright() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐾 高知県中央・中村小動物管理センター - HTMLスクレイピング');
  console.log('='.repeat(60) + '\n');

  let browser;
  try {
    console.log('🌐 ブラウザ起動中...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'TailMatch-Scraper/1.0 (+https://github.com/your-org/tail-match)',
    });
    const page = await context.newPage();

    console.log(`📡 アクセス: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    console.log(`⏳ ${CONFIG.waitTime / 1000}秒待機...`);
    await page.waitForTimeout(CONFIG.waitTime);

    console.log('🔍 ページ解析中...');
    const expectedExists = await page.$(CONFIG.expected_selectors);
    const html = await page.content();

    // 猫と犬の数を推定
    const catsCount = (html.match(/譲渡の猫/g) || []).length;
    const dogsCount = (html.match(/譲渡の犬/g) || []).length;

    console.log(
      `✅ HTMLサイズ: ${(html.length / 1024).toFixed(2)} KB (猫: ~${catsCount}箇所, 犬: ~${dogsCount}箇所)`
    );

    if (!expectedExists) {
      console.warn(`⚠️  警告: 期待するセレクタ "${CONFIG.expected_selectors}" が見つかりません`);
    }

    // 保存ディレクトリ作成
    const htmlDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(htmlDir, { recursive: true });

    // ファイル保存
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(htmlDir, filename);
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`💾 保存: ${filepath}\n`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals: expectedExists !== null,
      html_size: html.length,
      scraper: 'playwright',
      note: '犬猫混在ページ、カード形式、tabpagerページネーション',
    };
    const metadataPath = path.join(htmlDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log('='.repeat(60));
    console.log('✅ スクレイピング完了');
    console.log('='.repeat(60));

    await browser.close();
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    if (browser) await browser.close();
    process.exit(1);
  } finally {
    logger.finalize();
  }
}

scrapeWithPlaywright();
