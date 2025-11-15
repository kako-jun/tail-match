#!/usr/bin/env node

/**
 * 東京都動物愛護相談センター 譲渡動物情報 HTML収集スクリプト
 *
 * URL: https://shuyojoho.metro.tokyo.lg.jp/generals
 */

import { chromium } from 'playwright';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'tokyo/tokyo-metro',
  url: 'https://shuyojoho.metro.tokyo.lg.jp/generals',
  expected_selectors: 'div.content, table, article, div.main',
  timeout: 30000,
  waitTime: 5000, // 長めに待機（動的コンテンツ）
};

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 東京都動物愛護相談センター - 譲渡動物情報HTML収集');
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

    // 「猫・その他」タブをクリック
    console.log('🐱 猫・その他タブをクリック...');
    try {
      const catTabSelectors = [
        'a:has-text("猫・その他")',
        'button:has-text("猫・その他")',
        'li:has-text("猫・その他")',
        '[href*="cat"]',
        '[href*="neko"]',
      ];

      let clicked = false;
      for (const selector of catTabSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log(`✅ クリック成功: ${selector}`);
          clicked = true;
          break;
        } catch (e) {
          // 次のセレクタを試す
        }
      }

      if (clicked) {
        await page.waitForTimeout(3000);
      } else {
        console.warn('⚠️ 猫タブが見つかりませんでした');
      }
    } catch (error) {
      console.warn('⚠️ 猫タブクリックエラー:', error.message);
    }

    // HTML取得
    const html = await page.content();
    console.log(`✅ HTML取得完了: ${html.length} 文字`);

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
    const filename = `${timestamp}_joto.html`; // 譲渡用
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
      note: '譲渡動物情報（譲渡希望者向け）',
    };

    const metadataPath = path.join(outputDir, 'latest_joto_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`📋 メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTML収集完了');
    console.log('='.repeat(60));
  } catch (error) {
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

// 実行
main();
