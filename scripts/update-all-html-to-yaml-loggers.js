#!/usr/bin/env node

/**
 * html-to-yaml.js ファイルに一括でロガー統合を追加
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 既に統合済みの施設（スキップ）
const SKIP_LIST = new Set([
  'chiba/chiba-city-cats',
  'ishikawa/kanazawa-city-cats', // 手動で更新済み
]);

function updateLoggerIntegration(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. logger.start() が既にあるかチェック
  if (content.includes('logger.start()')) {
    return false; // 既に統合済み
  }

  // 2. const logger = createLogger(...) の後に start() と loadPreviousCounts() を追加
  const loggerCreatePattern = /(const logger = createLogger\([^)]+\);)\s*\n/;
  if (loggerCreatePattern.test(content)) {
    content = content.replace(
      loggerCreatePattern,
      '$1\n  logger.start();\n  logger.loadPreviousCounts(); // 前ステップのカウントを継承\n\n'
    );
    modified = true;
  }

  // 3. logger.logYAMLCount() の後、最終的な成功メッセージの前に finalize() を追加
  // パターン: logger.logYAMLCount(...) の後、console.log で「完了」「success」などの前
  if (!content.includes('logger.finalize()') && content.includes('logger.logYAMLCount')) {
    // 最後の fs.writeFileSync の後に finalize() を挿入
    const writeFilePattern = /(fs\.writeFileSync\([^;]+;)\s*\n\s*\n/;
    if (writeFilePattern.test(content)) {
      content = content.replace(writeFilePattern, '$1\n\n    logger.finalize(); // 履歴を保存\n\n');
      modified = true;
    }
  }

  // 4. catch ブロックの logger.logError() の後に finalize() を追加
  const logErrorPattern = /(logger\.logError\([^)]+\);)\s*\n(\s*)(console\.error)/;
  if (logErrorPattern.test(content) && !content.match(/logger\.logError[^}]+logger\.finalize/)) {
    content = content.replace(
      logErrorPattern,
      '$1\n$2logger.finalize(); // エラー時も履歴を保存\n$2$3'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  return false;
}

function findAllHtmlToYamlFiles(dir) {
  const results = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.name === 'html-to-yaml.js') {
        results.push(fullPath);
      }
    }
  }

  traverse(dir);
  return results;
}

function main() {
  console.log('🔧 html-to-yaml.js ロガー統合一括更新');
  console.log('='.repeat(60));

  const scrapersDir = path.join(__dirname, 'scrapers');
  const htmlToYamlFiles = findAllHtmlToYamlFiles(scrapersDir);

  console.log(`📂 検出: ${htmlToYamlFiles.length}個のhtml-to-yaml.jsファイル\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of htmlToYamlFiles) {
    // 相対パスを取得
    const relativePath = path.relative(scrapersDir, filePath);
    const parts = relativePath.split(path.sep);
    const municipality = `${parts[0]}/${parts[1]}`;

    // スキップリストチェック
    if (SKIP_LIST.has(municipality)) {
      console.log(`⏭️  スキップ: ${municipality} (既に統合済み)`);
      skipped++;
      continue;
    }

    try {
      const wasUpdated = updateLoggerIntegration(filePath);

      if (wasUpdated) {
        console.log(`✅ 更新: ${municipality}`);
        updated++;
      } else {
        console.log(`⏭️  スキップ: ${municipality} (変更不要)`);
        skipped++;
      }
    } catch (error) {
      console.error(`❌ エラー: ${municipality} - ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 更新結果');
  console.log('='.repeat(60));
  console.log(`  更新: ${updated}個`);
  console.log(`  スキップ: ${skipped}個`);
  console.log(`  エラー: ${errors}個`);
  console.log('='.repeat(60));

  if (errors > 0) {
    console.log('\n⚠️  一部のファイルでエラーが発生しました');
    process.exit(1);
  }

  console.log('\n✅ 全ファイルの更新完了');
}

main();
