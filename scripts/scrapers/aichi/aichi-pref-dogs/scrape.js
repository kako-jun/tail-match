#!/usr/bin/env node

/**
 * 愛知県動物愛護センター（全支所統合）犬 HTML収集スクリプト
 *
 * 本所: https://www.pref.aichi.jp/soshiki/doukan-c/honsyoinu.html
 * 尾張支所: https://www.pref.aichi.jp/soshiki/doukan-c/owariinu.html
 * 知多支所: 404エラー（犬用ページなし）
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
  municipality: 'aichi/aichi-pref-dogs',
  urls: [
    { name: 'honjo', url: 'https://www.pref.aichi.jp/soshiki/doukan-c/honsyoinu.html' },
    { name: 'owari', url: 'https://www.pref.aichi.jp/soshiki/doukan-c/owariinu.html' },
    // 知多支所は犬用ページなし（404）
  ],
  expected_selectors: 'table, div.content, article',
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
  console.log('🐕 愛知県動物愛護センター（全支所）- HTML収集');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   支所数: ${CONFIG.urls.length}`);
  console.log('='.repeat(60) + '\n');

  let browser;
  let allHtml = '';
  let totalAnimals = 0;

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

    // 各支所のHTMLを取得
    for (const branch of CONFIG.urls) {
      console.log(`\n📄 ${branch.name}支所のページにアクセス中: ${branch.url}`);

      await page.goto(branch.url, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout,
      });

      console.log(`⏳ JavaScript実行を待機中 (${CONFIG.waitTime}ms)...`);
      await page.waitForTimeout(CONFIG.waitTime);

      const html = await page.content();
      console.log(`✅ HTML取得完了: ${html.length} 文字`);

      // 支所名をマーカーとして追加
      const markedHtml = `<!-- BRANCH: ${branch.name} -->\n${html}\n<!-- END BRANCH: ${branch.name} -->\n\n`;
      allHtml += markedHtml;

      const count = countAnimalsInHTML(html);
      console.log(`   ${branch.name}支所: ${count}匹`);
      totalAnimals += count;
    }

    console.log(`\n📊 合計: ${totalAnimals}匹`);
    logger.logHTMLCount(totalAnimals);

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

    // HTML保存（全支所統合）
    fs.writeFileSync(filepath, allHtml, 'utf-8');
    console.log(`💾 HTML保存完了: ${filepath}`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      urls: CONFIG.urls.map((b) => b.url),
      branches: CONFIG.urls.map((b) => b.name),
      has_animals: allHtml.includes('犬') || allHtml.includes('イヌ') || allHtml.includes('管理No'),
      html_size: allHtml.length,
      scraper: 'playwright',
      note: '愛知県全支所統合・犬譲渡情報（知多支所は犬用ページなし）',
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
 * 愛知県は「管理No.数字」パターンで各犬を識別
 */
function countAnimalsInHTML(html) {
  // 全角数字を半角に変換（愛知県は全角数字を使用）
  const normalizedHtml = html.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );

  // 「管理No.」パターンをカウント
  const managementNoPattern = /管理No\.?\s*\d+/gi;
  const matches = normalizedHtml.match(managementNoPattern);

  if (matches) {
    return matches.length;
  }

  // フォールバック: テーブル行をカウント（ヘッダー除外）
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tablePattern);
  if (tables && tables.length > 0) {
    const trPattern = /<tr[^>]*>/gi;
    const rows = tables[0].match(trPattern);
    if (rows && rows.length > 1) {
      return rows.length - 1;
    }
  }

  return 0;
}

// 実行
main();
