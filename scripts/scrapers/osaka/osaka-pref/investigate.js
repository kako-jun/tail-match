#!/usr/bin/env node

/**
 * 大阪府動物愛護管理センター サイト調査スクリプト
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // メインページを訪問
  console.log('メインページを確認中...');
  await page.goto('http://www.pref.osaka.lg.jp/doaicenter/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 譲渡情報へのリンクを探す
  const links = await page.$$eval('a', (links) =>
    links
      .filter((a) => a.textContent.includes('譲渡') || a.textContent.includes('猫'))
      .map((a) => ({ text: a.textContent.trim(), href: a.href }))
  );

  console.log('\n譲渡関連リンク:');
  links.forEach((link) => console.log(`  - ${link.text}: ${link.href}`));

  // ブラウザを開いたままにして手動確認
  console.log('\nブラウザを開いたままにします。手動で確認してください。');
  console.log('Ctrl+C で終了します。');

  await new Promise(() => {}); // Keep browser open
}

main().catch(console.error);
