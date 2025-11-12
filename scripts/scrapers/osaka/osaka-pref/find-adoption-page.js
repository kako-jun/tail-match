#!/usr/bin/env node

/**
 * 大阪府動物愛護管理センター 譲渡ページ探索スクリプト
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 動物愛護管理センターページを訪問
    console.log('動物愛護管理センターページを確認中...');
    await page.goto('https://www.pref.osaka.lg.jp/soshikikarasagasu/doaicenter/index.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // すべてのリンクを取得
    const allLinks = await page.$$eval('a', (links) =>
      links.map((a) => ({ text: a.textContent.trim(), href: a.href }))
    );

    console.log('\nすべてのリンク数:', allLinks.length);

    // 譲渡関連リンクのみフィルタ
    const adoptionLinks = allLinks.filter(
      (link) =>
        link.text.includes('譲渡') ||
        link.text.includes('猫') ||
        link.text.includes('ネコ') ||
        link.text.includes('飼い主') ||
        link.text.includes('里親')
    );

    console.log('\n譲渡関連リンク:');
    adoptionLinks.forEach((link) => console.log(`  - ${link.text}: ${link.href}`));

    // ページのHTMLから"譲渡"というキーワードを含むエリアを探す
    const pageContent = await page.content();
    const hasAdoption = pageContent.includes('譲渡情報') || pageContent.includes('譲渡会');
    console.log(`\nページに譲渡情報が含まれているか: ${hasAdoption}`);
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

main();
