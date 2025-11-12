#!/usr/bin/env node

/**
 * 横浜市動物愛護センター スクレイピングスクリプト
 *
 * 特徴:
 * - 静的HTMLページ
 * - 画像ベースのリスト表示
 * - ページネーションなし
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 設定
// ========================================

const CONFIG = {
  url: 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/jotoinfo-cat.html',
  municipality: 'kanagawa/yokohama-city',
  outputDir: path.join(process.cwd(), 'data', 'html', 'kanagawa', 'yokohama-city'),
  userAgent: 'TailMatchBot/1.0 (https://tail-match.llll-ll.com; research@example.com)',
};

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 横浜市動物愛護センター - スクレイピング');
  console.log('='.repeat(60));
  console.log(`   URL: ${CONFIG.url}`);
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
    // ページにアクセス
    console.log(`📡 ページにアクセス中: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });

    // ページ読み込み完了を待つ
    await page.waitForTimeout(2000);

    console.log('✅ ページ読み込み完了\n');

    // HTMLを取得
    const html = await page.content();

    // タイムスタンプ生成
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

    // HTMLを保存
    const filename = `${timestamp}_tail.html`;
    const filepath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, html, 'utf-8');

    console.log(`💾 HTML保存: ${filepath}`);
    console.log(`📊 ファイルサイズ: ${html.length} bytes`);

    // メタデータを保存
    const metadata = {
      url: CONFIG.url,
      timestamp: timestamp,
      municipality: CONFIG.municipality,
      filename: filename,
      size: html.length,
      scraped_at: new Date().toISOString(),
    };

    const metadataPath = path.join(CONFIG.outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`📝 メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ スクレイピング完了');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 実行
main();
