#!/usr/bin/env node

/**
 * 新潟県動物愛護センター（猫）HTML収集スクリプト
 * 成猫＋子猫の2ページを統合
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../../lib/history-logger.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'niigata/niigata-pref-cats',
  urls: {
    adults: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1334350843426.html',
    kittens: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1344055708060.html',
  },
  expected_selectors: 'h3, img',
  timeout: 60000,
  waitTime: 5000,
};

// ========================================
// 動物カウント
// ========================================

/**
 * HTMLから猫の数をカウント
 * h3要素で飼育場所を判定（16b、18a、3段ケージなど）
 */
function countAnimalsInHTML(html) {
  // h3要素内の飼育場所パターン
  const h3Pattern = /<h3[^>]*>(.*?)<\/h3>/gi;
  const matches = html.match(h3Pattern);

  if (!matches) {
    console.log('  ⚠️  猫情報が見つかりませんでした');
    return 0;
  }

  // h3の中身を抽出して、飼育場所を探す
  const catLocations = [];
  matches.forEach((h3) => {
    const innerTextMatch = h3.match(/<h3[^>]*>(.*?)<\/h3>/i);
    if (innerTextMatch) {
      const text = innerTextMatch[1]
        .replace(/<[^>]+>/g, '')
        .trim()
        .replace(/\u200b/g, ''); // ゼロ幅スペース除去

      // 特殊な見出しを除外
      if (
        text &&
        !text.includes('愛護センター') &&
        !text.includes('トップページ') &&
        !text.includes('譲渡に関すること') &&
        !text.includes('飼い主募集') &&
        !text.includes('知っておきたいこと') &&
        !text.includes('他の保護施設') &&
        !text.includes('動画はこちら')
      ) {
        catLocations.push(text);
      }
    }
  });

  const uniqueLocations = [...new Set(catLocations)];
  console.log(`  🔍 検出: ${uniqueLocations.length}匹（飼育場所単位）`);

  return uniqueLocations.length;
}

// ========================================
// HTML収集
// ========================================

async function scrapeHTML() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log(`📄 ${CONFIG.municipality}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    let totalCount = 0;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

    const outputDir = path.join(process.cwd(), 'data/html', CONFIG.municipality);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 成猫ページ取得
    console.log(`🌐 アクセス: ${CONFIG.urls.adults} (成猫)`);
    const adultPage = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    await adultPage.goto(CONFIG.urls.adults, {
      waitUntil: 'load',
      timeout: CONFIG.timeout,
    });

    console.log(`⏳ ${CONFIG.waitTime / 1000}秒待機...`);
    await adultPage.waitForTimeout(CONFIG.waitTime);

    const adultHtml = await adultPage.content();
    const adultCount = countAnimalsInHTML(adultHtml);
    totalCount += adultCount;

    const adultPath = path.join(outputDir, `${timestamp}_adults.html`);
    fs.writeFileSync(adultPath, adultHtml, 'utf-8');
    console.log(`✅ 保存: ${adultPath} (${adultCount}匹)`);

    await adultPage.close();

    // 子猫ページ取得
    console.log(`\n🌐 アクセス: ${CONFIG.urls.kittens} (子猫)`);
    const kittenPage = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    await kittenPage.goto(CONFIG.urls.kittens, {
      waitUntil: 'load',
      timeout: CONFIG.timeout,
    });

    console.log(`⏳ ${CONFIG.waitTime / 1000}秒待機...`);
    await kittenPage.waitForTimeout(CONFIG.waitTime);

    const kittenHtml = await kittenPage.content();
    const kittenCount = countAnimalsInHTML(kittenHtml);
    totalCount += kittenCount;

    const kittenPath = path.join(outputDir, `${timestamp}_kittens.html`);
    fs.writeFileSync(kittenPath, kittenHtml, 'utf-8');
    console.log(`✅ 保存: ${kittenPath} (${kittenCount}匹)`);

    await kittenPage.close();

    // メタデータ保存
    const metadata = {
      timestamp: new Date().toISOString(),
      url_adults: CONFIG.urls.adults,
      url_kittens: CONFIG.urls.kittens,
      has_animals: totalCount > 0,
      adult_count: adultCount,
      kitten_count: kittenCount,
      total_count: totalCount,
      scraper: 'playwright',
      note: 'h3要素で飼育場所、画像altで猫名',
    };

    const metadataPath = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`\n✅ 収集完了`);
    console.log(`   成猫: ${adultCount}匹`);
    console.log(`   子猫: ${kittenCount}匹`);
    console.log(`   合計: ${totalCount}匹`);

    logger.logHTMLCount(totalCount);
    logger.finalize();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    logger.logError(error);
    logger.finalize();
    throw error;
  } finally {
    await browser.close();
  }
}

// 実行
scrapeHTML().catch((error) => {
  console.error('スクリプトエラー:', error);
  process.exit(1);
});
