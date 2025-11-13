#!/usr/bin/env node

/**
 * 全スクレイパーにhistory-logger統合を一括追加するスクリプト
 *
 * 実行: node scripts/add-logger-to-scrapers.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 各施設のカウントパターン定義
const COUNT_PATTERNS = {
  // テーブル行パターン
  table: `
  // テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    // ヘッダー行を除外
    const count = tableRows.length - 1;
    console.log(\`  🔍 テーブル行パターンで\${count}匹検出\`);
    return count > 0 ? count : 0;
  }
`,

  // カードパターン
  card: `
  // カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(\`  🔍 カードパターンで\${matches.length}匹検出\`);
      return matches.length;
    }
  }
`,

  // リンクパターン
  link: `
  // 詳細ページへのリンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const matches = html.match(linkPattern);
  if (matches) {
    console.log(\`  🔍 詳細リンクパターンで\${matches.length}匹検出\`);
    return matches.length;
  }
`,

  // 汎用パターン（画像カウント）
  generic: `
  // 画像タグをカウント（汎用フォールバック）
  const imgPattern = /<img[^>]*src="[^"]*"[^>]*>/gi;
  const allImages = html.match(imgPattern);
  if (allImages) {
    // アイコンや装飾画像を除外
    const animalImages = allImages.filter(img =>
      !img.includes('icon') &&
      !img.includes('logo') &&
      !img.includes('button')
    );
    if (animalImages.length > 0) {
      console.log(\`  🔍 画像パターンで\${animalImages.length}匹検出\`);
      return animalImages.length;
    }
  }
`,
};

/**
 * スクレイパーファイルにlogger統合を追加
 */
function addLoggerToScraper(filePath) {
  console.log(`\n処理中: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');

  // すでにloggerが統合されているか確認
  if (content.includes('createLogger') || content.includes('history-logger')) {
    console.log('  ✅ すでにloggerが統合されています - スキップ');
    return 'skipped';
  }

  // 1. インポート文を追加
  const importRegex = /(import.*from\s+['"].*timestamp\.js['"];?\s*\n)/;
  if (importRegex.test(content)) {
    content = content.replace(
      importRegex,
      "$1import { createLogger } from '../../../lib/history-logger.js';\n"
    );
    console.log('  ✓ インポート文を追加');
  } else {
    console.warn('  ⚠️  timestamp.jsのインポートが見つかりません');
    return 'failed';
  }

  // 2. main関数/メイン関数の先頭にlogger.start()を追加
  const mainFunctionRegex = /(async function (?:main|scrape\w+)\(\)\s*{)/;
  if (mainFunctionRegex.test(content)) {
    content = content.replace(
      mainFunctionRegex,
      '$1\n  const logger = createLogger(CONFIG.municipality);\n  logger.start();\n'
    );
    console.log('  ✓ logger.start()を追加');
  } else {
    console.warn('  ⚠️  main関数が見つかりません');
    return 'failed';
  }

  // 3. HTML取得後にcountAnimalsInHTML()を追加
  const htmlGetRegex =
    /(const html(?:Content)? = await (?:page\.content|fetchWithRetry)\(\);?\s*\n\s*console\.log\([`'].*HTML取得.*\);?\s*\n)/;
  if (htmlGetRegex.test(content)) {
    content = content.replace(
      htmlGetRegex,
      '$1\n    // HTML内の動物数をカウント\n    const animalCount = countAnimalsInHTML(html);\n    logger.logHTMLCount(animalCount);\n'
    );
    console.log('  ✓ countAnimalsInHTML()呼び出しを追加');
  } else {
    console.warn('  ⚠️  HTML取得処理が見つかりません');
  }

  // 4. エラーハンドリングにlogger.logError()を追加
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error) {\n    logger.logError(error);'
  );
  console.log('  ✓ logger.logError()を追加');

  // 5. finallyブロックまたは成功時にlogger.finalize()を追加
  if (content.includes('} finally {')) {
    content = content.replace(/} finally {/g, '    logger.finalize();\n  } finally {');
  } else {
    // finallyブロックがない場合、catchブロックの後に追加
    content = content.replace(/(} catch \(error\) {[\s\S]*?}\s*)(})/, '$1  logger.finalize();\n$2');
  }
  console.log('  ✓ logger.finalize()を追加');

  // 6. countAnimalsInHTML関数を追加（ファイル末尾のmain()の前）
  const countFunction = `
/**
 * HTML内の動物数をカウント
 */
function countAnimalsInHTML(html) {
${COUNT_PATTERNS.table}
${COUNT_PATTERNS.card}
${COUNT_PATTERNS.link}
${COUNT_PATTERNS.generic}

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}

`;

  // main()またはscrapeXXX()の直前に関数を挿入
  content = content.replace(/(\/\/ 実行\s*\n(?:main|scrape\w+)\(\);?\s*\n)/, `${countFunction}$1`);
  console.log('  ✓ countAnimalsInHTML()関数を追加');

  // ファイルに書き戻し
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('  ✅ 更新完了');

  return 'updated';
}

/**
 * メイン処理
 */
function main() {
  console.log('='.repeat(60));
  console.log('全スクレイパーにhistory-logger統合を追加');
  console.log('='.repeat(60));

  // すでに処理済みの5施設（Phase 1）
  const processedFiles = [
    'chiba/chiba-city-cats',
    'ishikawa/aigo-ishikawa',
    'okinawa/okinawa-pref-cats',
    'hokkaido/hokkaido-pref',
    'tokyo/tokyo-metro-cats',
  ];

  // 全スクレイパーを検索
  const scrapersDir = path.join(__dirname, 'scrapers');
  const allScrapeFiles = [];

  function findScrapeFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findScrapeFiles(fullPath);
      } else if (item === 'scrape.js') {
        allScrapeFiles.push(fullPath);
      }
    }
  }

  findScrapeFiles(scrapersDir);

  // 処理対象のファイルをフィルタリング
  const targetFiles = allScrapeFiles.filter((file) => {
    const relativePath = path.relative(scrapersDir, file);
    const municipalityPath = path.dirname(relativePath);
    return !processedFiles.includes(municipalityPath);
  });

  console.log(`\n処理対象: ${targetFiles.length}施設`);
  console.log(`スキップ: ${processedFiles.length}施設（Phase 1完了済み）\n`);

  // 各ファイルを処理
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of targetFiles) {
    const result = addLoggerToScraper(file);
    if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('処理完了');
  console.log('='.repeat(60));
  console.log(`✅ 更新: ${updated}施設`);
  console.log(`⏭️  スキップ: ${skipped}施設`);
  console.log(`❌ 失敗: ${failed}施設`);
  console.log('='.repeat(60));
}

main();
