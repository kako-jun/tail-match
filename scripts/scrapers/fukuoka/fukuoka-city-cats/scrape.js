#!/usr/bin/env node

/**
 * 福岡市動物愛護管理センター HTML収集スクリプト（猫）
 *
 * URL: https://zuttoissho.com/omukae/animal/cat/
 * 注: 福岡市の譲渡情報は外部サイトで管理されています
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
  municipality: 'fukuoka/fukuoka-city-cats',
  url: 'https://zuttoissho.com/omukae/animal/cat/',
  expected_selectors: 'article, a[href*="/animal/"]',
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
  console.log('🐱 福岡市動物愛護管理センター - HTML収集（猫）');
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
      note: 'リスト形式、仮名・年齢・毛色・施設名表示、「申込者あり」ステータス',
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
 * 福岡市（zuttoissho.com）は <a> タグのリンクで各猫を表示
 * c番号（例：c4780）で始まるリンクをカウント
 */
function countAnimalsInHTML(html) {
  // c番号で始まるリンク（例：c4780【ミルクボランティア猫・仮名：カイ】）を検索
  const pattern = /<a[^>]*>[\s\S]*?c\d+【[^】]*】[\s\S]*?<\/a>/gi;
  const matches = html.match(pattern);

  if (!matches) {
    console.log('  ⚠️  猫情報が見つかりませんでした');
    return 0;
  }

  console.log(`  🔍 検出: ${matches.length}匹`);
  return matches.length;
}

// 実行
main();
