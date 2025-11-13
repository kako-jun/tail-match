#!/usr/bin/env node

/**
 * 宮城県動物愛護センター（犬） HTML収集スクリプト
 *
 * URL: https://www.pref.miyagi.jp/soshiki/doubutuaigo/jyoto-inu-syokai.html
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
  municipality: 'miyagi/miyagi-pref-dogs',
  url: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/jyoto-inu-syokai.html',
  expected_selectors: 'h3, h5, ul, img',
  timeout: 30000,
  waitTime: 5000, // 長めに待機（動的コンテンツ）
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐕 宮城県動物愛護センター（犬） - HTML収集');
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
      waitUntil: 'networkidle',
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
  } finally {
    if (browser) {
      await browser.close();
    }
    logger.finalize();
  }
}

/**
 * HTML内の動物数をカウント
 * 宮城県犬は<h3>タグで各犬を識別（例: ID:12654　キキ）
 */
function countAnimalsInHTML(html) {
  // パターン1: <h3>ID:12654　キキ</h3>
  const h3Pattern = /<h3[^>]*>ID:\d+[　\s].+?<\/h3>/gi;
  const matches = html.match(h3Pattern);

  if (matches) {
    console.log(`  🔍 <h3>IDパターンで${matches.length}匹検出`);
    return matches.length;
  }

  // パターン2: <h3>タグに「ID:」が含まれる
  const h3WithID = html.match(/<h3[^>]*>ID:\d+.*?<\/h3>/gi);
  if (h3WithID) {
    console.log(`  🔍 <h3>IDパターン（広範）で${h3WithID.length}匹検出`);
    return h3WithID.length;
  }

  // フォールバック: コンテンツエリア内の<h3>タグをカウント
  const contentMatch = html.match(/<div[^>]*id="tmp_contents"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    const contentArea = contentMatch[1];
    const h3Tags = contentArea.match(/<h3[^>]*>/gi);
    if (h3Tags) {
      console.log(`  🔍 コンテンツエリア内の<h3>タグで${h3Tags.length}匹検出`);
      return h3Tags.length;
    }
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
