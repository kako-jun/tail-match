#!/usr/bin/env node

/**
 * 富山県動物管理センター スクレイパー (Playwright版)
 *
 * 特徴:
 * - Playwright でJavaScript実行後のHTMLを取得
 * - プロキシ対応（環境変数HTTPS_PROXY/HTTP_PROXY）
 * - リトライ機能（最大3回）
 * - 礼儀正しいスクレイピング（3秒間隔）
 * - レンダリング済みHTMLを保存（DB保存は別スクリプト）
 */

import { chromium } from 'playwright';
import { load } from 'cheerio';
import { saveHtml, saveMetadata } from '../../../lib/html-saver.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'toyama/toyama-pref',
  url: 'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/cat.html',
  expected_selectors: 'div.col2L img, div.col2R img',

  // リトライ設定
  retry_count: 3,
  retry_delay: 2000, // 2秒

  // 礼儀正しいスクレイピング
  request_delay: 3000, // 3秒
  timeout: 30000, // 30秒

  // User-Agent
  user_agent:
    'TailMatchBot/1.0 (Tail Match Animal Rescue Service; +https://tail-match.llll-ll.com; contact@tail-match.llll-ll.com)',

  // JavaScript実行待機時間
  wait_for_js: 5000, // 5秒
};

// ========================================
// プロキシ設定
// ========================================

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const launchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
  ],
};

if (proxyUrl) {
  console.log(`🔐 プロキシを使用: ${proxyUrl}\n`);
  launchOptions.proxy = {
    server: proxyUrl,
  };
}

// プロキシ環境での証明書エラーを無視
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  launchOptions.ignoreHTTPSErrors = true;
}

// ========================================
// ユーティリティ
// ========================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付きPlaywrightページアクセス
 */
async function fetchWithRetry(url, retries = CONFIG.retry_count) {
  let browser = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 ブラウザアクセス試行 ${attempt}/${retries}...`);

      browser = await chromium.launch(launchOptions);
      const context = await browser.newContext({
        userAgent: CONFIG.user_agent,
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo',
      });

      const page = await context.newPage();

      // ページにアクセス
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout,
      });

      // JavaScript実行完了まで待機
      console.log(`⏳ JavaScript実行完了まで${CONFIG.wait_for_js / 1000}秒待機...`);
      await page.waitForTimeout(CONFIG.wait_for_js);

      // 動的コンテンツの読み込み完了を確認
      try {
        await page.waitForSelector('div.col2L, div.col2R', {
          timeout: 5000,
        });
        console.log('✅ 動的コンテンツの読み込み確認');
      } catch {
        console.log('⚠️ 期待するセレクタが見つからない（静的サイトの可能性）');
      }

      // レンダリング済みHTMLを取得
      const html = await page.content();
      console.log(`✅ データ取得成功 (${html.length} bytes)\n`);

      await browser.close();
      return html;
    } catch (error) {
      console.error(`❌ エラー (試行 ${attempt}/${retries}): ${error.message}`);

      if (browser) {
        await browser.close().catch(() => {});
      }

      if (attempt < retries) {
        console.log(`⏳ ${CONFIG.retry_delay / 1000}秒後にリトライします...\n`);
        await sleep(CONFIG.retry_delay);
      } else {
        throw new Error(`最大リトライ回数に達しました: ${error.message}`);
      }
    }
  }
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 富山県動物管理センター - HTML収集 (Playwright版)');
  console.log('='.repeat(60));
  console.log(`   URL: ${CONFIG.url}`);
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: レンダリング済みHTML取得
    console.log('🌐 ブラウザでJavaScript実行後のHTML取得中...');
    const html = await fetchWithRetry(CONFIG.url);

    // Note: Playwright使用により、JavaScript実行後の完全レンダリングHTMLを取得
    console.log('💡 Playwrightでレンダリング済みHTMLを取得 - 動的コンテンツも含まれています\n');

    // Step 3: 掲載有無チェック（0匹 or 1匹以上）
    const $ = load(html);
    const selectors = CONFIG.expected_selectors.split(',').map((s) => s.trim());
    let hasAnyAnimals = false;

    for (const selector of selectors) {
      if ($(selector).length > 0) {
        hasAnyAnimals = true;
        break; // 1個でも見つかればOK
      }
    }

    const displayCount = hasAnyAnimals ? 'cats' : 0;
    console.log(`\n📊 検出結果: ${hasAnyAnimals ? '動物の掲載あり' : '掲載なし'}`);

    // Step 4: HTML保存
    const result = saveHtml(html, {
      municipality: CONFIG.municipality,
      count: hasAnyAnimals ? 1 : 0,
      animalType: 'tail',
    });

    console.log(`\n${result.message}`);
    console.log(`✅ 保存: ${result.filepath}`);
    console.log(`📊 サイズ: ${result.size} bytes`);

    // Step 5: メタデータ保存
    const metadata = {
      timestamp: new Date().toISOString(),
      url: CONFIG.url,
      has_animals: hasAnyAnimals,
      html_size: result.size,
      scraper: 'playwright',
      note: 'JavaScript実行後の完全レンダリングHTML取得',
    };

    const metadataPath = saveMetadata(metadata, CONFIG.municipality);
    console.log(`✅ メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTML収集完了');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
