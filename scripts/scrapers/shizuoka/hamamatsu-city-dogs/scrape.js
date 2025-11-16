#!/usr/bin/env node

/**
 * 浜松市動物愛護教育センター（犬） スクレイピングスクリプト
 *
 * 特徴:
 * - 一覧ページ + 詳細ページの2階層構造
 * - 各犬に個別の詳細ページあり
 * - HTML形式（定義リスト形式）
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 設定
// ========================================

const CONFIG = {
  listUrl: 'https://www.hama-aikyou.jp/jouto/yuzuriuke/',
  municipality: 'shizuoka/hamamatsu-city-dogs',
  outputDir: path.join(process.cwd(), 'data', 'html', 'shizuoka', 'hamamatsu-city-dogs'),
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

// ========================================
// HTML内の動物数をカウント
// ========================================

function countAnimalsInHTML(html) {
  // 詳細ページのh1タグをカウント（各詳細ページに1つ）
  const h1Matches = html.match(/<h1[^>]*>/g);
  return h1Matches ? h1Matches.length : 0;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐶 浜松市動物愛護教育センター（犬）- スクレイピング');
  console.log('='.repeat(60));
  console.log(`   List URL: ${CONFIG.listUrl}`);
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  // 出力ディレクトリ作成
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  // Playwright起動
  console.log('🌐 ブラウザ起動中...\n');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
  });

  const page = await context.newPage();

  try {
    // 一覧ページにアクセス
    console.log(`📡 一覧ページにアクセス中: ${CONFIG.listUrl}`);
    await page.goto(CONFIG.listUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 一覧ページ読み込み完了\n');

    // 詳細ページへのリンクを取得
    const detailLinks = await page.$$eval(
      'a[href*="/jouto/yuzuriuke/"]',
      (links) =>
        links
          .map((link) => link.href)
          .filter(
            (href) =>
              href.includes('/jouto/yuzuriuke/') &&
              href !== 'https://www.hama-aikyou.jp/jouto/yuzuriuke/' &&
              !href.endsWith('/jouto/yuzuriuke/index.html') // 一覧ページ自体を除外
          )
          .filter((href, index, self) => self.indexOf(href) === index) // 重複除去
    );

    console.log(`🔗 詳細ページリンク: ${detailLinks.length}件\n`);
    detailLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });
    console.log();

    // すべての詳細ページのHTMLを結合
    let combinedHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>浜松市動物愛護教育センター - 譲渡犬一覧</title>
</head>
<body>
`;

    // 各詳細ページをスクレイピング
    for (let i = 0; i < detailLinks.length; i++) {
      const detailUrl = detailLinks[i];
      console.log(`📡 詳細ページ ${i + 1}/${detailLinks.length}: ${detailUrl}`);

      await page.goto(detailUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const detailHTML = await page.content();
      combinedHTML += `\n<!-- Detail Page ${i + 1}: ${detailUrl} -->\n`;
      combinedHTML += detailHTML;

      console.log(`  ✅ 取得完了\n`);
    }

    combinedHTML += `
</body>
</html>`;

    // HTML内の動物数をカウント
    const animalCount = detailLinks.length; // 詳細ページの数 = 動物数
    logger.logHTMLCount(animalCount);

    // タイムスタンプ生成（日本時間）
    const timestamp = getJSTTimestamp();

    // HTMLを保存
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, combinedHTML, 'utf-8');

    console.log(`💾 HTML保存: ${filepath}`);
    console.log(`📊 ファイルサイズ: ${combinedHTML.length} bytes`);

    // メタデータを保存
    const metadata = {
      url: CONFIG.listUrl,
      timestamp: timestamp,
      municipality: CONFIG.municipality,
      filename: filename,
      size: combinedHTML.length,
      scraped_at: getJSTISOString(),
      detail_pages: detailLinks,
      animal_count: animalCount,
    };

    const metadataPath = path.join(CONFIG.outputDir, `${timestamp}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`💾 メタデータ保存: ${metadataPath}\n`);
    console.log('='.repeat(60));
    console.log('✅ スクレイピング完了');
    console.log('='.repeat(60));

    logger.finalize();
  } catch (error) {
    console.error('❌ エラー発生:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// ========================================
// 実行
// ========================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
