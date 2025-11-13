#!/usr/bin/env node

/**
 * 神奈川県動物愛護センター HTML収集スクリプト
 *
 * URL: https://www.pref.kanagawa.jp/osirase/1594/awc/receive/cat.html
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
  municipality: 'kanagawa/kanagawa-pref-cats',
  url: 'https://www.pref.kanagawa.jp/osirase/1594/awc/receive/cat.html',
  expected_selectors: 'div.content, table, article, div.main',
  timeout: 30000,
  waitTime: 5000,
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('🐱 神奈川県動物愛護センター - HTML収集');
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
      userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護猫情報収集Bot',
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

    // ページネーションボタンをクリックして全ページを取得
    console.log('📜 ページネーションで全ページを取得中...');

    let allHtmlPages = [];
    let currentPage = 1;
    let previousFirstCardText = '';

    while (true) {
      // ページ遷移後の待機
      await page.waitForTimeout(2000);

      // 現在のページのカード数を確認
      const currentCardCount = await page.locator('.column.is-one-quarter-desktop').count();

      // 最初のカードのテキストを取得（コンテンツが変わったか確認）
      const firstCardText = await page
        .locator('.column.is-one-quarter-desktop')
        .first()
        .textContent();

      console.log(`   ページ ${currentPage}: ${currentCardCount} カード`);

      // 現在のページのHTMLを保存
      allHtmlPages.push(await page.content());

      // 最初のカードのテキストが同じなら終了（同じページを繰り返している）
      if (currentPage > 1 && firstCardText === previousFirstCardText) {
        console.log('   ✅ 最終ページに到達（コンテンツが変わらない）');
        allHtmlPages.pop(); // 重複を削除
        break;
      }

      previousFirstCardText = firstCardText;

      // 「次のページ」ボタンを探してクリック
      try {
        // 複数の可能なセレクタを試す
        const nextButtonSelectors = [
          'a:has-text("次のページ")',
          'button:has-text("次のページ")',
          '.pagination-next',
          'a[aria-label="次のページ"]',
          'button[aria-label="次のページ"]',
        ];

        let nextButton = null;
        for (const selector of nextButtonSelectors) {
          try {
            nextButton = page.locator(selector).first();
            if (await nextButton.isVisible({ timeout: 2000 })) {
              break;
            }
          } catch (e) {
            // このセレクタでは見つからなかった
          }
        }

        if (nextButton && (await nextButton.isVisible())) {
          console.log(`   → 次のページへ`);
          await nextButton.click();
          await page.waitForTimeout(3000); // ページ遷移を待つ
          currentPage++;
        } else {
          console.log('   ✅ 最終ページに到達（次へボタンなし）');
          break;
        }
      } catch (error) {
        logger.logError(error);
        console.log('   ✅ ページネーション終了');
        break;
      }

      // 安全のための上限
      if (currentPage > 10) {
        console.log('   ⚠️ ページ数上限到達');
        break;
      }
    }

    console.log(`📊 総ページ数: ${allHtmlPages.length}`);

    // HTML内の動物数をカウント（全ページの合計）
    let totalCount = 0;
    for (const html of allHtmlPages) {
      totalCount += countAnimalsInHTML(html);
    }
    console.log(`📊 全ページ合計: ${totalCount}匹`);
    logger.logHTMLCount(totalCount);

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

    // 各ページのHTMLを個別に保存
    for (let i = 0; i < allHtmlPages.length; i++) {
      const filename = `${timestamp}_tail_page${i + 1}.html`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, allHtmlPages[i], 'utf-8');
      console.log(`💾 ページ ${i + 1} 保存: ${filepath}`);
    }

    // 最初のページを代表HTMLとして保存（後方互換性）
    const mainFilename = `${timestamp}_tail.html`;
    const mainFilepath = path.join(outputDir, mainFilename);
    fs.writeFileSync(mainFilepath, allHtmlPages[0], 'utf-8');
    console.log(`💾 代表HTML保存: ${mainFilepath}`);

    // メタデータ保存
    const metadata = {
      timestamp: getJSTISOString(),
      url: CONFIG.url,
      has_animals:
        allHtmlPages[0].includes('猫') ||
        allHtmlPages[0].includes('ネコ') ||
        allHtmlPages[0].includes('ねこ'),
      html_size: allHtmlPages[0].length,
      total_pages: allHtmlPages.length,
      scraper: 'playwright',
      note: 'JavaScript実行後の完全レンダリングHTML取得（ページネーション対応）',
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
    logger.finalize();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * HTML内の動物数をカウント
 */
function countAnimalsInHTML(html) {
  // テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    // ヘッダー行を除外
    const count = tableRows.length - 1;
    console.log(`  🔍 テーブル行パターンで${count}匹検出`);
    return count > 0 ? count : 0;
  }

  // カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  🔍 カードパターンで${matches.length}匹検出`);
      return matches.length;
    }
  }

  // 詳細ページへのリンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const matches = html.match(linkPattern);
  if (matches) {
    console.log(`  🔍 詳細リンクパターンで${matches.length}匹検出`);
    return matches.length;
  }

  // 画像タグをカウント（汎用フォールバック）
  const imgPattern = /<img[^>]*src="[^"]*"[^>]*>/gi;
  const allImages = html.match(imgPattern);
  if (allImages) {
    // アイコンや装飾画像を除外
    const animalImages = allImages.filter(
      (img) => !img.includes('icon') && !img.includes('logo') && !img.includes('button')
    );
    if (animalImages.length > 0) {
      console.log(`  🔍 画像パターンで${animalImages.length}匹検出`);
      return animalImages.length;
    }
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

// 実行
main();
