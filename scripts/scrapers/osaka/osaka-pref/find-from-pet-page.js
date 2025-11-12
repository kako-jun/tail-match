#!/usr/bin/env node

/**
 * 大阪府ペット・動物ページから譲渡情報探索
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // ペット・動物ページを訪問
    console.log('ペット・動物ページを確認中...');
    await page.goto('https://www.pref.osaka.lg.jp/kurashi/pet/index.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 譲渡関連リンクを探す
    const adoptionLinks = await page.$$eval('a', (links) =>
      links
        .filter(
          (a) =>
            a.textContent.includes('譲渡') ||
            a.textContent.includes('猫') ||
            a.textContent.includes('飼い主') ||
            a.textContent.includes('保護') ||
            a.textContent.includes('収容')
        )
        .map((a) => ({ text: a.textContent.trim(), href: a.href }))
    );

    console.log('\n譲渡・保護関連リンク:');
    adoptionLinks.forEach((link) => console.log(`  - ${link.text}: ${link.href}`));

    // ページタイトルとURL確認
    const title = await page.title();
    console.log(`\nページタイトル: ${title}`);
    console.log(`現在のURL: ${page.url()}`);
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

main();
