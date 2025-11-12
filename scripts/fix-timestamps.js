#!/usr/bin/env node

/**
 * タイムスタンプをUTCから日本時間（JST）に一括変換
 *
 * すべてのスクレイパーのタイムスタンプ生成を日本時間に統一します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('⏰ タイムスタンプ修正スクリプト（UTC → JST）');
console.log('='.repeat(60));
console.log('');

// 修正するパターン
const patterns = [
  {
    // パターン1: new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0]
    find: /new Date\(\)\.toISOString\(\)\.replace\(\/\[-:\]\/g, ''\)\.replace\('T', '_'\)\.split\('\.\'\)\[0\]/g,
    replace: 'getJSTTimestamp()',
    description: 'ファイル名用タイムスタンプ（YYYYMMDD_HHMMSS）',
  },
  {
    // パターン2: new Date().toISOString()（メタデータ用）
    find: /new Date\(\)\.toISOString\(\)/g,
    replace: 'getJSTISOString()',
    description: 'ISO 8601タイムスタンプ',
  },
];

// インポート文を追加するパターン
const importPattern = /^import .* from .*;?\s*$/m;
const importStatement =
  "import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';\n";

// 修正対象のファイルを検索
function findScraperFiles() {
  const scraperDir = path.join(__dirname, 'scrapers');
  const files = [];

  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  traverse(scraperDir);
  return files;
}

// ファイルを修正
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let changesCount = 0;

  // 各パターンを適用
  for (const pattern of patterns) {
    const matches = content.match(pattern.find);
    if (matches) {
      content = content.replace(pattern.find, pattern.replace);
      modified = true;
      changesCount += matches.length;
    }
  }

  // インポート文が必要か確認
  if (modified) {
    // 既にインポートが存在するか確認
    if (!content.includes('from') || !content.includes('timestamp.js')) {
      // 最初のインポート文の後に追加
      const match = content.match(importPattern);
      if (match) {
        const index = match.index + match[0].length;
        content = content.slice(0, index) + importStatement + content.slice(index);
      } else {
        // インポート文がない場合は、ファイルの先頭に追加
        content = importStatement + '\n' + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { modified, changesCount };
}

// メイン処理
function main() {
  const files = findScraperFiles();
  console.log(`📁 検索したファイル数: ${files.length}\n`);

  let modifiedFiles = 0;
  let totalChanges = 0;

  for (const file of files) {
    const { modified, changesCount } = fixFile(file);
    if (modified) {
      modifiedFiles++;
      totalChanges += changesCount;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`✅ ${relativePath} (${changesCount}箇所)`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 修正結果');
  console.log('='.repeat(60));
  console.log(`修正したファイル: ${modifiedFiles}個`);
  console.log(`修正箇所: ${totalChanges}箇所`);
  console.log('');
  console.log('✅ タイムスタンプ修正完了');
  console.log('');
  console.log('次のステップ:');
  console.log('  1. 修正内容を確認: git diff');
  console.log('  2. 動作確認');
  console.log('  3. コミット');
  console.log('');
}

main();
