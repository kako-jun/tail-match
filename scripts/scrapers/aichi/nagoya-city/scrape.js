#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター HTML収集スクリプト
 *
 * URL: https://dog-cat-support.nagoya/adoption/
 *
 * 特徴:
 * - 日付ごとにペット画像を掲載
 * - 個別情報は画像内に記載（OCR必要）
 * - ステータス画像で譲渡状況を表示
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
  municipality: 'aichi/nagoya-city',
  url: 'https://dog-cat-support.nagoya/adoption/',
  expected_selectors: 'h3, a[href*=".html"], img',
  timeout: 30000,
  waitTime: 3000,
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱🐕 名古屋市動物愛護センター - HTML収集');
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
      userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護猫犬情報収集Bot',
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
      has_animals: html.includes('images/adoption/'),
      html_size: html.length,
      scraper: 'playwright',
      note: '名古屋市・犬猫混在・画像OCR必要',
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
 * 名古屋市は画像リンク（251114-001.html形式）で各動物を識別
 */
function countAnimalsInHTML(html) {
  // 詳細ページリンク（YYMMDD-NNN.html形式）をカウント
  const detailLinkPattern = /href="\d{6}-\d{3}\.html"/gi;
  const matches = html.match(detailLinkPattern);

  if (matches) {
    console.log(`  🔍 詳細ページリンクで${matches.length}匹検出`);
    return matches.length;
  }

  // フォールバック: adoption画像をカウント
  const imagePattern = /images\/adoption\/\d{6}\/\d{3}\.jpg/gi;
  const imageMatches = html.match(imagePattern);
  if (imageMatches) {
    console.log(`  🔍 画像パターンで${imageMatches.length}匹検出`);
    return imageMatches.length;
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
