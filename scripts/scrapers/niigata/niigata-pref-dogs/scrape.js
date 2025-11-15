#!/usr/bin/env node

/**
 * 新潟県動物愛護センター（犬）HTML収集スクリプト
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../../lib/history-logger.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'niigata/niigata-pref-dogs',
  url: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1334350842609.html',
  expected_selectors: 'h3, img',
  timeout: 60000,
  waitTime: 5000, // 5秒待機（県のサイトはロードが遅い）
};

// ========================================
// 動物カウント
// ========================================

/**
 * HTMLから犬の数をカウント
 * h3要素で犬の名前を判定（犬名: ゆきお、うめきち）
 */
function countAnimalsInHTML(html) {
  // h3要素内の犬名パターン（ゆきお、うめきちなど）
  // または画像altの管理番号パターン（25長YD02、24芝YD006など）
  const h3Pattern = /<h3[^>]*>(.*?)<\/h3>/gi;
  const matches = html.match(h3Pattern);

  if (!matches) {
    console.log('  ⚠️  犬情報が見つかりませんでした');
    return 0;
  }

  // h3の中身を抽出して、犬の名前を探す
  const dogNames = [];
  matches.forEach((h3) => {
    const innerTextMatch = h3.match(/<h3[^>]*>(.*?)<\/h3>/i);
    if (innerTextMatch) {
      const text = innerTextMatch[1]
        .replace(/<[^>]+>/g, '')
        .trim()
        .replace(/\u200b/g, ''); // ゼロ幅スペース除去

      // 特殊な見出し（「愛護センタートップページへ」など）を除外
      if (
        text &&
        !text.includes('愛護センター') &&
        !text.includes('トップページ') &&
        !text.includes('譲渡に関すること') &&
        !text.includes('飼い主募集')
      ) {
        dogNames.push(text);
      }
    }
  });

  const uniqueDogs = [...new Set(dogNames)];
  console.log(`  🔍 検出: ${uniqueDogs.length}匹`);
  if (uniqueDogs.length > 0) {
    console.log(`     名前: ${uniqueDogs.join(', ')}`);
  }

  return uniqueDogs.length;
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
    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    // ページ読み込み
    console.log(`🌐 アクセス: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: 'load',
      timeout: CONFIG.timeout,
    });

    // 動的コンテンツの読み込み待機
    console.log(`⏳ ${CONFIG.waitTime / 1000}秒待機...`);
    await page.waitForTimeout(CONFIG.waitTime);

    // HTML取得
    const html = await page.content();
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

    // 保存先
    const outputDir = path.join(process.cwd(), 'data/html', CONFIG.municipality);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const htmlPath = path.join(outputDir, `${timestamp}_tail.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // 動物数カウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // メタデータ保存
    const metadata = {
      timestamp: new Date().toISOString(),
      url: CONFIG.url,
      has_animals: animalCount > 0,
      html_size: html.length,
      scraper: 'playwright',
      note: 'h3要素で犬名、画像altで管理番号',
    };

    const metadataPath = path.join(outputDir, 'latest_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`✅ 保存完了`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   動物数: ${animalCount}匹`);

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
