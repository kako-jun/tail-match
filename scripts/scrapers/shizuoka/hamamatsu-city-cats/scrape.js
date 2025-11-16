#!/usr/bin/env node

/**
 * 浜松市動物愛護教育センター（猫） スクレイピングスクリプト
 *
 * 特徴:
 * - 一覧ページから成猫のPDFリンクを取得
 * - PDFをダウンロードして保存
 * - 子猫は頭数のみ（詳細情報なし）
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 設定
// ========================================

const CONFIG = {
  listUrl: 'https://www.hama-aikyou.jp/jouto/cat/',
  municipality: 'shizuoka/hamamatsu-city-cats',
  outputDir: path.join(process.cwd(), 'data', 'pdf', 'shizuoka', 'hamamatsu-city-cats'),
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

// ========================================
// PDFダウンロード
// ========================================

function downloadPDF(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱 浜松市動物愛護教育センター（猫）- PDFスクレイピング');
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

    // 成猫PDFへのリンクを取得（「成猫」または「わけあり猫」）
    const pdfLinks = await page.$$eval('a[href$=".pdf"]', (links) =>
      links
        .map((link) => ({
          url: link.href,
          text: link.textContent.trim(),
        }))
        .filter((link) => link.text.includes('成猫') || link.text.includes('わけあり猫'))
    );

    console.log(`📄 成猫PDFリンク: ${pdfLinks.length}件\n`);
    pdfLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text}`);
      console.log(`     ${link.url}`);
    });
    console.log();

    // 子猫の頭数を取得（参考情報）
    const kittenInfo = await page.$$eval('p, div', (elements) => {
      for (const elem of elements) {
        const text = elem.textContent;
        if (text.includes('か月齢未満') || text.includes('か月～')) {
          return text.trim();
        }
      }
      return null;
    });

    if (kittenInfo) {
      console.log(`📊 子猫情報: ${kittenInfo}\n`);
    }

    // 各PDFをダウンロード
    const timestamp = getJSTTimestamp();
    let totalCats = 0;

    for (let i = 0; i < pdfLinks.length; i++) {
      const link = pdfLinks[i];
      const pdfUrl = link.url;
      const pdfName = pdfUrl.split('/').pop();

      console.log(`📥 PDF ${i + 1}/${pdfLinks.length}: ${pdfName}`);

      const pdfPath = path.join(CONFIG.outputDir, pdfName);
      await downloadPDF(pdfUrl, pdfPath);

      console.log(`  ✅ ダウンロード完了: ${pdfPath}\n`);

      // PDFごとに想定される猫の数（1 or 2）
      // ミーシャ・エルなど、名前が2つの場合は2匹
      const catCount = link.text.includes('・') ? 2 : 1;
      totalCats += catCount;
    }

    logger.logHTMLCount(totalCats);

    // メタデータを保存
    const metadata = {
      url: CONFIG.listUrl,
      timestamp: timestamp,
      municipality: CONFIG.municipality,
      scraped_at: getJSTISOString(),
      pdf_count: pdfLinks.length,
      estimated_cat_count: totalCats,
      pdf_links: pdfLinks,
      kitten_info: kittenInfo,
    };

    const metadataPath = path.join(CONFIG.outputDir, `${timestamp}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`💾 メタデータ保存: ${metadataPath}\n`);
    console.log('='.repeat(60));
    console.log('✅ PDFダウンロード完了');
    console.log(`📊 推定猫数: ${totalCats}匹`);
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
