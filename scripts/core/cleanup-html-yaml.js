#!/usr/bin/env node

/**
 * HTML/YAMLファイル整理スクリプト
 *
 * 各施設で最も匹数が多いファイルを1つずつ残し、それ以外を削除する
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_DIR = process.cwd();
const HTML_DIR = path.join(DATA_DIR, 'data', 'html');
const YAML_DIR = path.join(DATA_DIR, 'data', 'yaml');
const HISTORY_FILE = path.join(DATA_DIR, '.claude', 'shelters-history.yaml');

// ========================================
// ユーティリティ関数
// ========================================

function getAllDirectories(baseDir) {
  const directories = [];

  function traverse(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        directories.push(fullPath);
        traverse(fullPath);
      }
    }
  }

  traverse(baseDir);
  return directories;
}

function getFilesInDirectory(dir, extension) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(extension))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      stat: fs.statSync(path.join(dir, f)),
    }))
    .sort((a, b) => b.stat.mtime - a.stat.mtime); // 新しい順
}

function extractCountFromYaml(yamlPath) {
  try {
    const content = fs.readFileSync(yamlPath, 'utf-8');
    const data = yaml.load(content);

    if (data?.meta?.total_count !== undefined) {
      return data.meta.total_count;
    }

    if (Array.isArray(data?.animals)) {
      return data.animals.length;
    }

    return 0;
  } catch (error) {
    console.warn(`  ⚠️  YAML読み込みエラー: ${path.basename(yamlPath)}`);
    return 0;
  }
}

function extractCountFromHistoryRun(run) {
  if (run.yaml_count !== undefined) return run.yaml_count;
  if (run.html_count !== undefined) return run.html_count;
  if (run.db_count !== undefined) return run.db_count;
  return 0;
}

function getMunicipalityKeyFromPath(filePath) {
  // data/html/chiba/chiba-city-cats/... -> chiba/chiba-city-cats
  const parts = filePath.split(path.sep);
  const dataIndex = parts.findIndex((p) => p === 'data');
  if (dataIndex === -1) return null;

  // data/html/{prefecture}/{municipality}
  if (parts.length > dataIndex + 3) {
    return `${parts[dataIndex + 2]}/${parts[dataIndex + 3]}`;
  }

  return null;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🧹 HTML/YAMLファイル整理スクリプト');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('⚠️  DRY RUNモード: 実際の削除は行いません\n');
  } else {
    console.log('🔥 実行モード: ファイルを実際に削除します\n');
  }

  // 履歴ファイルを読み込み
  let history = {};
  if (fs.existsSync(HISTORY_FILE)) {
    const historyContent = fs.readFileSync(HISTORY_FILE, 'utf-8');
    history = yaml.load(historyContent) || {};
  }

  const stats = {
    totalHtmlFiles: 0,
    totalYamlFiles: 0,
    keptHtmlFiles: 0,
    keptYamlFiles: 0,
    deletedHtmlFiles: 0,
    deletedYamlFiles: 0,
    facilitiesProcessed: 0,
  };

  // HTML/YAMLディレクトリのすべての施設ディレクトリを取得
  const allDirs = new Set([...getAllDirectories(HTML_DIR), ...getAllDirectories(YAML_DIR)]);

  const municipalityDirs = Array.from(allDirs)
    .filter((dir) => {
      const key = getMunicipalityKeyFromPath(dir);
      return key && key.includes('/');
    })
    .sort();

  console.log(`📊 処理対象施設数: ${municipalityDirs.length}\n`);

  for (const dir of municipalityDirs) {
    const municipalityKey = getMunicipalityKeyFromPath(dir);
    const relativeDir = dir.replace(DATA_DIR + path.sep, '');

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📁 ${relativeDir}`);
    console.log(`${'─'.repeat(60)}`);

    // HTML処理
    const htmlDir = dir.replace('/yaml/', '/html/');
    const htmlFiles = getFilesInDirectory(htmlDir, '.html');
    stats.totalHtmlFiles += htmlFiles.length;

    if (htmlFiles.length > 0) {
      console.log(`\n🌐 HTML: ${htmlFiles.length}ファイル`);

      // 最新のHTMLを1つ残す
      const keepFile = htmlFiles[0];
      console.log(
        `  ✅ 保持: ${keepFile.name} (${new Date(keepFile.stat.mtime).toLocaleString('ja-JP')})`
      );
      stats.keptHtmlFiles++;

      // それ以外を削除
      for (let i = 1; i < htmlFiles.length; i++) {
        const deleteFile = htmlFiles[i];
        console.log(`  🗑️  削除: ${deleteFile.name}`);

        if (!DRY_RUN) {
          fs.unlinkSync(deleteFile.path);
        }
        stats.deletedHtmlFiles++;
      }
    } else {
      console.log(`\n🌐 HTML: ファイルなし`);
    }

    // YAML処理
    const yamlDir = dir.replace('/html/', '/yaml/');
    const yamlFiles = getFilesInDirectory(yamlDir, '.yaml');
    stats.totalYamlFiles += yamlFiles.length;

    if (yamlFiles.length > 0) {
      console.log(`\n📄 YAML: ${yamlFiles.length}ファイル`);

      // 各YAMLの匹数を確認
      const yamlWithCounts = yamlFiles.map((f) => ({
        ...f,
        count: extractCountFromYaml(f.path),
      }));

      // 匹数が最も多いファイルを保持
      yamlWithCounts.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.stat.mtime - a.stat.mtime; // 同数なら新しい方
      });

      const keepFile = yamlWithCounts[0];
      console.log(`  ✅ 保持: ${keepFile.name} (${keepFile.count}匹)`);
      stats.keptYamlFiles++;

      // それ以外を削除
      for (let i = 1; i < yamlWithCounts.length; i++) {
        const deleteFile = yamlWithCounts[i];
        console.log(`  🗑️  削除: ${deleteFile.name} (${deleteFile.count}匹)`);

        if (!DRY_RUN) {
          fs.unlinkSync(deleteFile.path);
        }
        stats.deletedYamlFiles++;
      }
    } else {
      console.log(`\n📄 YAML: ファイルなし`);
    }

    stats.facilitiesProcessed++;
  }

  // サマリー表示
  console.log('\n' + '='.repeat(60));
  console.log('📊 整理完了サマリー');
  console.log('='.repeat(60));
  console.log(`\n処理施設数: ${stats.facilitiesProcessed}`);
  console.log(`\n🌐 HTML:`);
  console.log(`  総ファイル数: ${stats.totalHtmlFiles}`);
  console.log(`  保持: ${stats.keptHtmlFiles}`);
  console.log(`  削除: ${stats.deletedHtmlFiles}`);
  console.log(`\n📄 YAML:`);
  console.log(`  総ファイル数: ${stats.totalYamlFiles}`);
  console.log(`  保持: ${stats.keptYamlFiles}`);
  console.log(`  削除: ${stats.deletedYamlFiles}`);

  if (DRY_RUN) {
    console.log(
      `\n⚠️  DRY RUNモードでした。実際に削除するには --dry-run を外して実行してください。`
    );
  } else {
    console.log(`\n✅ ファイル削除が完了しました。`);
  }

  console.log('='.repeat(60));
}

// 実行
main().catch((error) => {
  console.error('❌ エラーが発生しました:');
  console.error(error);
  process.exit(1);
});
