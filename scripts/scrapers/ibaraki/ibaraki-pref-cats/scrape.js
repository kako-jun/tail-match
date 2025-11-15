#!/usr/bin/env node

/**
 * 茨城県動物指導センター スクレイピングスクリプト（猫）
 *
 * - PDF形式で公開されている猫の情報をダウンロード
 * - PDFファイル名は日付ベース（例: neko1113.pdf）
 */

import { chromium } from 'playwright';
import { createLogger } from '../../../lib/history-logger.js';
import { getJSTTimestamp } from '../../../lib/timestamp.js';
import fs from 'fs';
import path from 'path';
import https from 'https';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ibaraki/ibaraki-pref-cats',
  baseUrl: 'https://www.pref.ibaraki.jp',
  pdfListUrl: 'https://www.pref.ibaraki.jp/hokenfukushi/doshise/hogo/syuuyou.html',
};

const USER_AGENT = 'Tail Match Scraper (+https://github.com/arioriori/tail-match)';

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱 茨城県動物指導センター - PDF取得（猫）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });

    const page = await context.newPage();

    console.log(`📄 アクセス: ${CONFIG.pdfListUrl}`);
    await page.goto(CONFIG.pdfListUrl, { waitUntil: 'domcontentloaded' });

    // 「成猫」PDFリンクを探す
    const pdfLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const catLink = links.find((a) => a.textContent.includes('成猫') && a.href.endsWith('.pdf'));
      return catLink ? catLink.href : null;
    });

    if (!pdfLink) {
      throw new Error('猫のPDFリンクが見つかりません');
    }

    console.log(`🔗 PDF URL: ${pdfLink}`);

    // PDFをダウンロード
    const pdfUrl = pdfLink.startsWith('http') ? pdfLink : `${CONFIG.baseUrl}${pdfLink}`;

    const timestamp = getJSTTimestamp();
    const outputDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const filename = `${timestamp}_cats.pdf`;
    const filepath = path.join(outputDir, filename);

    await downloadPDF(pdfUrl, filepath);

    logger.logHTMLCount(1); // PDFファイル1つ

    console.log(`💾 PDF保存完了: ${filepath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF取得完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
    logger.finalize();
  }
}

/**
 * PDFダウンロード
 */
function downloadPDF(url, filepath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${url}`));
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlinkSync(filepath);
          reject(err);
        });
      })
      .on('error', reject);
  });
}

// ========================================
// 実行
// ========================================

main();
