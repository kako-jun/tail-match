#!/usr/bin/env node

/**
 * 神戸市動物管理センター URLを検索
 */

import { chromium } from 'playwright';

async function main() {
  console.log('🔍 神戸市動物管理センター 譲渡情報ページを検索中...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護猫情報収集Bot',
  });

  const page = await context.newPage();

  try {
    // 神戸市公式サイトから探す
    const searchUrl = 'https://www.google.com/search?q=神戸市+動物管理センター+猫+譲渡';
    console.log(`📄 検索URL: ${searchUrl}\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 検索結果から神戸市公式サイトのURLを取得
    const links = await page.$$eval('a', (anchors) =>
      anchors
        .map((a) => ({ text: a.innerText, href: a.href }))
        .filter((link) => link.href && link.href.includes('kobe.lg.jp'))
        .slice(0, 5)
    );

    console.log('✅ 見つかった神戸市公式サイトのリンク:\n');
    links.forEach((link, i) => {
      console.log(`${i + 1}. ${link.text}`);
      console.log(`   ${link.href}\n`);
    });
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

main();
