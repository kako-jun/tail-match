#!/usr/bin/env node

/**
 * 広島市動物愛護センター（猫・犬混在） HTML収集スクリプト
 *
 * URL: https://www.city.hiroshima.lg.jp/living/pet-doubutsu/1021301/1026246/1023100.html
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
  municipality: 'hiroshima/hiroshima-city',
  url: 'https://www.city.hiroshima.lg.jp/living/pet-doubutsu/1021301/1026246/1023100.html',
  expected_selectors: 'h3, h4, img, p',
  timeout: 60000,
  waitTime: 8000, // 長めに待機（統一設定）
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱🐕 広島市動物愛護センター（猫・犬混在） - HTML収集');
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
      has_animals: html.includes('猫') || html.includes('犬'),
      html_size: html.length,
      scraper: 'playwright',
      note: '猫・犬混在ページ',
    };

    const metadataPath = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`📋 メタデータ保存: ${metadataPath}`);

    // ブラウザクローズ
    await browser.close();
    console.log('🔒 ブラウザクローズ完了');

    logger.finalize({
      status: 'success',
      animals_detected: animalCount,
      output_file: filepath,
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ スクレイピング完了: ${animalCount}匹検出`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error);

    logger.finalize({
      status: 'error',
      error: error.message,
    });

    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

/**
 * HTML内の動物数をカウント
 * 広島市は<h4>タグで各動物を識別
 * - 猫: No.7-9-5（はちのすけ）譲渡が決まりました！
 * - 犬: 7-10-3（らーめん）申請中
 */
function countAnimalsInHTML(html) {
  // パターン: <h4>[No.]番号-番号-番号（名前）[ステータス]</h4>
  // 猫は "No." prefix, 犬は prefix なし
  const h4Pattern = /<h4[^>]*>(?:No\.)?[67]-\d+-\d+[（(].+?[)）]/gi;
  const matches = html.match(h4Pattern);

  if (matches) {
    console.log(`  🔍 <h4>番号パターンで${matches.length}匹検出`);
    return matches.length;
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
