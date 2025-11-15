#!/usr/bin/env node

/**
 * 水戸市動物愛護センター スクレイピングスクリプト（犬）
 */

import { chromium } from 'playwright';
import { createLogger } from '../../../lib/history-logger.js';
import { getJSTTimestamp } from '../../../lib/timestamp.js';
import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ibaraki/mito-city-dogs',
  url: 'https://www.city.mito.lg.jp/site/doubutsuaigo/2041.html',
};

const USER_AGENT = 'Tail Match Scraper (+https://github.com/arioriori/tail-match)';

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐕 水戸市動物愛護センター - HTML取得（犬）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });

    const page = await context.newPage();

    console.log(`📄 アクセス: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // ページのHTMLを取得
    const html = await page.content();

    // 保存先ディレクトリ作成
    const timestamp = getJSTTimestamp();
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    // HTML保存
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, html, 'utf-8');

    logger.logHTMLCount(1);

    console.log(`💾 HTML保存完了: ${filepath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTML取得完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
    logger.finalize();
  }
}

// ========================================
// 実行
// ========================================

main();
