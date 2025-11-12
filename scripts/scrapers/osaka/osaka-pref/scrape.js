#!/usr/bin/env node

/**
 * 大阪府動物愛護管理センター HTML収集スクリプト
 *
 * 特徴:
 * - Playwright使用（JavaScript実行が必要な可能性）
 * - 猫の譲渡情報ページを取得
 * - タイムスタンプ付きでHTMLを保存
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import { chromium } from 'playwright';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'osaka/osaka-pref',
  url: 'https://www.pref.osaka.lg.jp/o120200/doaicenter/doaicenter/jyoutoneko.html',
  expected_selectors: 'div.content, table, article', // 期待されるHTML要素
  timeout: 30000, // 30秒
  waitTime: 3000, // ページ読み込み後の待機時間
};

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🌐 大阪府動物愛護管理センター - HTML取得');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   URL: ${CONFIG.url}`);
  console.log('='.repeat(60) + '\n');

  let browser;
  try {
    // Playwright起動
    console.log('🚀 Playwrightブラウザ起動中...\n');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'TailMatchBot/1.0 (+https://github.com/kako-jun/tail-match; 保護猫情報収集)',
    });
    const page = await context.newPage();

    // ページ読み込み
    console.log('📄 ページ読み込み中...\n');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });

    // JavaScript実行完了まで待機
    await page.waitForTimeout(CONFIG.waitTime);

    // HTML取得
    const html = await page.content();
    console.log(`📊 HTML取得完了: ${html.length}文字\n`);

    // 保存先ディレクトリ
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(outputDir, { recursive: true });

    // タイムスタンプ付きファイル名
    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_tail.html`);

    // HTML保存
    fs.writeFileSync(outputFile, html, 'utf-8');
    console.log(`✅ HTML保存完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals: html.includes('猫') || html.includes('ネコ'),
      html_size: html.length,
      scraper: 'playwright',
      note: 'JavaScript実行後の完全レンダリングHTML取得',
    };

    const metadataFile = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✅ メタデータ保存: ${metadataFile}\n`);

    console.log('='.repeat(60));
    console.log('✅ HTML取得完了');
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
