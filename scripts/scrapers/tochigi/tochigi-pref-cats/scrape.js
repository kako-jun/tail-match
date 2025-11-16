#!/usr/bin/env node

/**
 * 栃木県動物愛護指導センター HTML収集スクリプト（猫）
 *
 * URL: https://www.douai.pref.tochigi.lg.jp/work/kitten/
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
  municipality: 'tochigi/tochigi-pref-cats',
  url: 'https://www.douai.pref.tochigi.lg.jp/work/kitten/',
  expected_selectors: 'table, div',
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
  console.log('🐱 栃木県動物愛護指導センター（猫） - HTML収集');
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
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ページへアクセス
    console.log(`📄 ページにアクセス中: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    // JavaScript実行を待機
    console.log(`⏳ JavaScript実行を待機中 (${CONFIG.waitTime}ms)...`);
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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * HTML内の動物数をカウント
 * 栃木県はAケージ番号形式
 */
function countAnimalsInHTML(html) {
  // Aケージパターンで検出
  const cagePattern = /Aケージ/gi;
  const matches = html.match(cagePattern);
  if (matches) {
    console.log(`  🔍 Aケージパターンで${matches.length}匹検出`);
    return matches.length;
  }

  // フォールバック: 「番号」キーワードをカウント
  const numberPattern = /番号\s*[:：]\s*\d+/gi;
  const numberMatches = html.match(numberPattern);
  if (numberMatches) {
    console.log(`  🔍 番号パターンで${numberMatches.length}匹検出`);
    return numberMatches.length;
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
