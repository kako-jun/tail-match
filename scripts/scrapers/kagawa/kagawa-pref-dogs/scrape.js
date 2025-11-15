#!/usr/bin/env node

/**
 * 香川県動物愛護管理センター PDF収集スクリプト（犬）
 *
 * URL: https://www.pref.kagawa.lg.jp/s-doubutuaigo/sanukidouaicenter/jyouto/s04u6e190311095146.html
 * 注: さぬき動物愛護センター「しっぽの森」（香川県・高松市共同運営）
 *     PDFファイルで譲渡情報を提供
 */

import { chromium } from 'playwright';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { createLogger } from '../../../lib/history-logger.js';
import axios from 'axios';

import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'kagawa/kagawa-pref-dogs',
  listUrl:
    'https://www.pref.kagawa.lg.jp/s-doubutuaigo/sanukidouaicenter/jyouto/s04u6e190311095146.html',
  baseUrl: 'https://www.pref.kagawa.lg.jp',
  pdfLinkPattern: '/documents/.*dog\\.pdf',
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
  console.log('🐕 香川県動物愛護管理センター - PDF収集（犬）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log(`   List URL: ${CONFIG.listUrl}`);
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

    // リストページへアクセス
    console.log(`📄 リストページにアクセス中: ${CONFIG.listUrl}`);
    await page.goto(CONFIG.listUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    // ページ読み込み待機
    console.log(`⏳ ページ読み込み待機中 (${CONFIG.waitTime}ms)...`);
    await page.waitForTimeout(CONFIG.waitTime);

    // PDFリンクを取得
    console.log('🔍 犬用PDFリンクを検索中...');
    const pdfLinks = await page.$$eval('a[href*="dog.pdf"]', (links) =>
      links.map((link) => link.getAttribute('href'))
    );

    if (pdfLinks.length === 0) {
      throw new Error('犬用PDFリンクが見つかりませんでした');
    }

    const pdfRelativePath = pdfLinks[0];
    const pdfUrl = pdfRelativePath.startsWith('http')
      ? pdfRelativePath
      : `${CONFIG.baseUrl}${pdfRelativePath}`;

    console.log(`✅ PDFリンク取得: ${pdfUrl}`);

    // ブラウザを閉じる（PDFダウンロードにはaxiosを使用）
    await browser.close();
    browser = null;

    // PDFをダウンロード
    console.log('📥 PDFをダウンロード中...');
    const pdfResponse = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'TailMatch/1.0 (+https://tail-match.llll-ll.com)',
      },
    });

    const pdfBuffer = Buffer.from(pdfResponse.data);
    console.log(`✅ PDF取得完了: ${pdfBuffer.length} バイト`);

    // カウントは0（PDFの中身は後でpdf-to-yaml.jsで解析）
    logger.logHTMLCount(0);

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
    const filename = `${timestamp}_tail.pdf`;
    const filepath = path.join(outputDir, filename);

    // PDF保存
    fs.writeFileSync(filepath, pdfBuffer);
    console.log(`💾 PDF保存完了: ${filepath}`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      list_url: CONFIG.listUrl,
      pdf_url: pdfUrl,
      pdf_size: pdfBuffer.length,
      scraper: 'playwright-pdf',
      note: '表形式PDF、左に画像セル、譲渡済みは上に文字が被さる',
    };

    const metadataPath = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`📋 メタデータ保存: ${metadataPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF収集完了');
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
    logger.finalize();
  }
}

// 実行
main();
