/**
 * JavaScript必須サイト自動検出
 *
 * 静的HTMLで取得したコンテンツがJavaScript動的レンダリングか判定
 * 5つのシグナルで判定し、2つ以上該当でJS必須と判断
 */

import { load } from 'cheerio';

/**
 * JavaScript必須サイトかどうかを自動検出
 *
 * @param {string} html - 静的HTML
 * @param {object} config - 設定オブジェクト
 * @param {string} config.expected_selectors - 期待されるCSSセレクタ（カンマ区切り）
 * @returns {object} 検出結果
 */
export function detectJavaScriptSite(html, config = {}) {
  const signals = {
    // シグナル1: 空のルート要素（React/Vue/Next.js等）
    emptyRoot: /<div id="(app|root|__next)">\s*<\/div>/i.test(html),

    // シグナル2: HTMLサイズが異常に小さい（5KB未満）
    tooSmall: html.length < 5000,

    // シグナル3: SPAフレームワークの痕跡
    spaFramework: /react|vue|angular|__NEXT_DATA__|__nuxt__/i.test(html),

    // シグナル4: 期待される要素が見つからない
    missingContent: false,

    // シグナル5: script bundleのみで実コンテンツなし
    onlyScripts:
      /<script[^>]*src=["'][^"']*?(main|app|bundle|chunk)\.js/i.test(html) &&
      !/<table|<article|<ul/i.test(html),
  };

  // シグナル4: 期待されるセレクタをチェック
  if (config.expected_selectors) {
    const $ = load(html);
    const selectors = config.expected_selectors.split(',').map((s) => s.trim());
    let foundCount = 0;

    for (const selector of selectors) {
      foundCount += $(selector).length;
    }

    signals.missingContent = foundCount === 0;
  }

  // スコアリング: 2つ以上該当でJS必須判定
  const trueSignals = Object.values(signals).filter(Boolean);
  const score = trueSignals.length;
  const isJavaScriptRequired = score >= 2;

  return {
    isJavaScriptRequired,
    signals,
    score,
    maxScore: Object.keys(signals).length,
    recommendation: isJavaScriptRequired
      ? '⚠️  Playwright/Puppeteerが必要です'
      : '✅ 静的HTMLで取得可能',
  };
}

/**
 * 検出結果を人間が読みやすい形式で出力
 *
 * @param {object} detection - detectJavaScriptSiteの返り値
 */
export function printDetectionResult(detection) {
  console.log('\n🔍 サイト解析結果:');
  console.log(`   判定: ${detection.recommendation}`);
  console.log(`   スコア: ${detection.score}/${detection.maxScore}`);

  if (detection.score > 0) {
    console.log('   検出されたシグナル:');
    Object.entries(detection.signals).forEach(([key, value]) => {
      if (value) {
        const labels = {
          emptyRoot: '空のルート要素（#app, #root等）',
          tooSmall: 'HTMLサイズが小さい（< 5KB）',
          spaFramework: 'SPAフレームワークの痕跡',
          missingContent: '期待される要素が見つからない',
          onlyScripts: 'scriptのみでコンテンツなし',
        };
        console.log(`     ✓ ${labels[key] || key}`);
      }
    });
  }
}
