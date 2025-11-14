#!/usr/bin/env node

/**
 * 北九州市動物愛護センター HTML収集スクリプト（犬）
 *
 * URL: https://www.city.kitakyushu.lg.jp/contents/924_11834.html
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
  municipality: 'fukuoka/kitakyushu-city-dogs',
  url: 'https://www.city.kitakyushu.lg.jp/contents/924_11834.html',
  expected_selectors: 'div.contents, table, article',
  timeout: 30000,
  waitTime: 3000, // 基本的に静的HTMLだが念のため
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐕 北九州市動物愛護センター - HTML収集（犬）');
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
      userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護犬情報収集Bot',
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
      has_animals: html.includes('犬') || html.includes('イヌ') || html.includes('いぬ'),
      html_size: html.length,
      scraper: 'playwright',
      note: '成犬と子犬のテーブル形式、検査結果あり',
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
 * 北九州市は成犬・子犬のテーブル内の<tr>タグ（ヘッダー除く）をカウント
 */
function countAnimalsInHTML(html) {
  // テーブル内の<tr>タグを検索（<th>を含む行はスキップ）
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tablePattern);

  if (!tables) {
    console.log('  ⚠️  テーブルが見つかりませんでした');
    return 0;
  }

  let totalCount = 0;

  tables.forEach((table, index) => {
    // ヘッダー行（<th>）を除いたデータ行（<tr>）をカウント
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (!rows) return;

    // <th>を含む行をフィルタリング
    const dataRows = rows.filter((row) => !row.includes('<th'));

    if (dataRows.length > 0) {
      console.log(`  🔍 テーブル${index + 1}: ${dataRows.length}行（データ）`);
      totalCount += dataRows.length;
    }
  });

  console.log(`  📊 合計: ${totalCount}匹検出`);
  return totalCount;
}

// 実行
main();
