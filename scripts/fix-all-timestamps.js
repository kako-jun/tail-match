#!/usr/bin/env node

/**
 * すべてのスクレイパーのタイムスタンプをJSTに一括変換
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('='.repeat(60));
console.log('⏰ タイムスタンプ一括変換（UTC → JST）');
console.log('='.repeat(60));
console.log('');

// find + grep でファイル一覧を取得
const result = execSync(
  'find scripts/scrapers -name "*.js" -type f -exec grep -l "toISOString" {} \\; 2>/dev/null || true',
  {
    encoding: 'utf-8',
  }
);

const files = result
  .trim()
  .split('\n')
  .filter((f) => f && !f.includes('node_modules'));

console.log(`📁 修正対象ファイル数: ${files.length}\n`);

let modifiedCount = 0;

for (const file of files) {
  console.log(`🔧 修正中: ${file}`);

  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // 1. 長いパターンを先に置換
  const longPattern1 =
    /new Date\(\)\.toISOString\(\)\.replace\(\/\[-:\]\/g, ''\)\.replace\('T', '_'\)\.split\('\.'\)\[0\]/g;
  const longPattern2 =
    /new Date\(\)\.toISOString\(\)\.slice\(0, 19\)\.replace\(\/\[-:\]\/g, ''\)\.replace\('T', '_'\)/g;

  if (longPattern1.test(content)) {
    content = content.replace(longPattern1, 'getJSTTimestamp()');
    modified = true;
  }

  if (longPattern2.test(content)) {
    content = content.replace(longPattern2, 'getJSTTimestamp()');
    modified = true;
  }

  // 2. 短いパターンを置換
  const shortPattern = /new Date\(\)\.toISOString\(\)/g;
  if (shortPattern.test(content)) {
    content = content.replace(shortPattern, 'getJSTISOString()');
    modified = true;
  }

  // 3. インポート文を追加
  if (modified && !content.includes('timestamp.js')) {
    // ファイル内の階層を判定
    const depth = (file.match(/\//g) || []).length - 2; // scripts/scrapers/ を引く
    const relativePath = '../'.repeat(depth) + 'lib/timestamp.js';

    // 最初のimport文を探す
    const importMatch = content.match(/^import .+ from .+;?\s*$/m);
    if (importMatch) {
      const importIndex = importMatch.index + importMatch[0].length;
      const importStatement = `\nimport { getJSTTimestamp, getJSTISOString } from '${relativePath}';\n`;
      content = content.slice(0, importIndex) + importStatement + content.slice(importIndex);
    }
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf-8');
    modifiedCount++;
    console.log('  ✅ 完了');
  } else {
    console.log('  ⏭️  スキップ（既に修正済み）');
  }
}

console.log('');
console.log('='.repeat(60));
console.log(`✅ 一括変換完了: ${modifiedCount}/${files.length}ファイル`);
console.log('='.repeat(60));
console.log('');
console.log('次のステップ:');
console.log('  1. 動作確認');
console.log('  2. git diff で確認');
console.log('  3. コミット');
console.log('');
