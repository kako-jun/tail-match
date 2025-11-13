#!/usr/bin/env node

/**
 * countAnimalsInHTML関数が欠けているscrape.jsに関数を追加
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// エラーが出ている10施設
const FACILITIES = [
  'chiba/chiba-pref-dogs',
  'hokkaido/sapporo-city-cats',
  'kanagawa/kanagawa-pref-dogs',
  'kyoto/kyoto-pref-dogs',
  'okinawa/naha-city',
  'okinawa/okinawa-pref-cats',
  'okinawa/okinawa-pref-dogs',
  'toyama/toyama-pref-cats',
  'toyama/toyama-pref-dogs',
  'fukui/fukui-pref-dogs',
];

// 汎用的なcountAnimalsInHTML関数（千葉県猫版をベースに改良）
const COUNT_FUNCTION = `
/**
 * HTML内の動物数をカウント（汎用版）
 * 複数のパターンに対応
 */
function countAnimalsInHTML(html) {
  // パターン1: テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    const count = tableRows.length - 1; // ヘッダー行を除外
    if (count > 0) {
      console.log(\`  🔍 テーブル行パターンで\${count}匹検出\`);
      return count;
    }
  }

  // パターン2: カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>/gi,
    /<article[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(\`  🔍 カードパターンで\${matches.length}匹検出\`);
      return matches.length;
    }
  }

  // パターン3: 詳細ページへのリンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const linkMatches = html.match(linkPattern);
  if (linkMatches && linkMatches.length > 0) {
    console.log(\`  🔍 詳細リンクパターンで\${linkMatches.length}匹検出\`);
    return linkMatches.length;
  }

  // パターン4: 動物名が含まれる要素をカウント（フォールバック）
  const animalKeywords = ['猫', 'ネコ', 'ねこ', '犬', 'イヌ', 'いぬ'];
  let maxCount = 0;
  for (const keyword of animalKeywords) {
    const regex = new RegExp(\`<h[2-4][^>]*>.*?\${keyword}.*?</h[2-4]>\`, 'gi');
    const matches = html.match(regex);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
    }
  }

  if (maxCount > 0) {
    console.log(\`  🔍 見出しパターンで\${maxCount}匹検出\`);
    return maxCount;
  }

  console.log('  ⚠️  動物データが見つかりませんでした');
  return 0;
}
`;

function addCountFunction(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 既に関数が定義されているかチェック
    if (content.includes('function countAnimalsInHTML')) {
      return { status: 'skip', reason: '既に定義済み' };
    }

    // main()の呼び出しの直前に関数を挿入
    // パターン1: "// 実行\nmain();"
    const mainCallPattern1 = /\n\/\/ 実行\nmain\(\);/;
    // パターン2: 単に "main();"
    const mainCallPattern2 = /\n\nmain\(\);\n$/;

    if (mainCallPattern1.test(content)) {
      content = content.replace(mainCallPattern1, `\n${COUNT_FUNCTION}\n// 実行\nmain();`);
    } else if (mainCallPattern2.test(content)) {
      content = content.replace(mainCallPattern2, `\n${COUNT_FUNCTION}\nmain();\n`);
    } else {
      return { status: 'error', reason: 'main()呼び出しが見つからない' };
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', reason: error.message };
  }
}

function main() {
  console.log('🔧 countAnimalsInHTML関数の一括追加');
  console.log('='.repeat(60));

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const facility of FACILITIES) {
    const filePath = path.join(__dirname, 'scrapers', facility, 'scrape.js');

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  スキップ: ${facility} (ファイルなし)`);
      skipped++;
      continue;
    }

    const result = addCountFunction(filePath);

    if (result.status === 'success') {
      console.log(`✅ 追加: ${facility}`);
      success++;
    } else if (result.status === 'skip') {
      console.log(`⏭️  スキップ: ${facility} (${result.reason})`);
      skipped++;
    } else {
      console.log(`❌ エラー: ${facility} - ${result.reason}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 実行結果');
  console.log('='.repeat(60));
  console.log(`  成功: ${success}個`);
  console.log(`  スキップ: ${skipped}個`);
  console.log(`  エラー: ${errors}個`);
  console.log('='.repeat(60));

  if (errors > 0) {
    console.log('\n⚠️  一部のファイルでエラーが発生しました');
    process.exit(1);
  }

  console.log('\n✅ 全ファイルの処理完了');
}

main();
