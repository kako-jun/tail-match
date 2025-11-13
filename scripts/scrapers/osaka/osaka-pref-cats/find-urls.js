#!/usr/bin/env node

/**
 * 大阪府動物愛護管理センター URL探索スクリプト
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // メインページを訪問
    console.log('メインページを確認中...');
    await page.goto('http://www.pref.osaka.lg.jp/doaicenter/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 譲渡情報へのリンクを探す
    const links = await page.$$eval('a', (links) =>
      links
        .filter(
          (a) =>
            a.textContent.includes('譲渡') ||
            a.textContent.includes('猫') ||
            a.textContent.includes('犬') ||
            a.textContent.includes('動物')
        )
        .map((a) => ({ text: a.textContent.trim(), href: a.href }))
    );

    console.log('\n動物関連リンク:');
    links.forEach((link) => console.log(`  - ${link.text}: ${link.href}`));

    // ページタイトルとURL確認
    const title = await page.title();
    const url = page.url();
    console.log(`\nページタイトル: ${title}`);
    console.log(`現在のURL: ${url}`);
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

main();
