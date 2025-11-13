#!/usr/bin/env node

/**
 * スクレイピング履歴サマリー表示スクリプト
 *
 * shelters-history.yamlから最新の実行結果を読み取り、
 * 不一致・エラー・成功率などをサマリー表示する
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(__dirname, '../.claude/shelters-history.yaml');

// ========================================
// メイン処理
// ========================================

function main() {
  if (!fs.existsSync(HISTORY_FILE)) {
    console.error('❌ 履歴ファイルが見つかりません:', HISTORY_FILE);
    process.exit(1);
  }

  const historyData = yaml.load(fs.readFileSync(HISTORY_FILE, 'utf8'));
  const scrapers = historyData.scrapers;

  // 統計を集計
  const stats = {
    total: 0,
    success: 0,
    error: 0,
    mismatch: 0,
    empty: 0,
    notRun: 0,
  };

  const mismatchList = [];
  const errorList = [];
  const emptyList = [];

  for (const [key, scraper] of Object.entries(scrapers)) {
    stats.total++;

    // 最新の実行結果を取得
    const lastRun = scraper.last_10_runs?.[0];

    if (!lastRun) {
      stats.notRun++;
      continue;
    }

    // ステータス別にカウント
    if (lastRun.status === 'success') {
      stats.success++;
    } else if (lastRun.status === 'error') {
      stats.error++;
      errorList.push({
        key,
        name: scraper.name,
        error: lastRun.error_message,
        timestamp: lastRun.timestamp,
      });
    } else if (lastRun.status === 'mismatch') {
      stats.mismatch++;
      mismatchList.push({
        key,
        name: scraper.name,
        html: lastRun.html_count,
        yaml: lastRun.yaml_count,
        db: lastRun.db_count,
        warning: lastRun.warning,
        timestamp: lastRun.timestamp,
      });
    } else if (lastRun.status === 'empty') {
      stats.empty++;
      emptyList.push({
        key,
        name: scraper.name,
        timestamp: lastRun.timestamp,
      });
    }
  }

  // サマリー表示
  console.log('');
  console.log('='.repeat(70));
  console.log('📊 スクレイピング実行結果サマリー');
  console.log('='.repeat(70));
  console.log('');
  console.log(`📍 対象施設数: ${stats.total}施設`);
  console.log(
    `✅ 成功: ${stats.success}施設 (${Math.round((stats.success / stats.total) * 100)}%)`
  );
  console.log(
    `⚠️  不一致（パース疑い）: ${stats.mismatch}施設 (${Math.round((stats.mismatch / stats.total) * 100)}%)`
  );
  console.log(`❌ エラー: ${stats.error}施設 (${Math.round((stats.error / stats.total) * 100)}%)`);
  console.log(`📭 動物0匹: ${stats.empty}施設 (${Math.round((stats.empty / stats.total) * 100)}%)`);
  console.log(`⏸️  未実行: ${stats.notRun}施設`);
  console.log('');

  // 不一致の詳細表示
  if (mismatchList.length > 0) {
    console.log('='.repeat(70));
    console.log(`⚠️  不一致検出（動物数減少の疑い）: ${mismatchList.length}施設`);
    console.log('='.repeat(70));
    console.log('');

    for (const item of mismatchList) {
      console.log(`📍 ${item.name} (${item.key})`);
      console.log(`   時刻: ${item.timestamp}`);
      console.log(`   HTML: ${item.html}匹 → YAML: ${item.yaml}匹 → DB: ${item.db}匹`);
      console.log(`   警告: ${item.warning}`);

      // 減少箇所を可視化
      if (item.html > item.yaml) {
        const diff = item.html - item.yaml;
        console.log(`   🔍 HTML→YAMLで${diff}匹減少 ← 要確認`);
      }
      if (item.yaml > item.db) {
        const diff = item.yaml - item.db;
        console.log(`   🔍 YAML→DBで${diff}匹減少 ← 要確認`);
      }
      console.log('');
    }
  }

  // エラーの詳細表示
  if (errorList.length > 0) {
    console.log('='.repeat(70));
    console.log(`❌ エラー発生: ${errorList.length}施設`);
    console.log('='.repeat(70));
    console.log('');

    for (const item of errorList) {
      console.log(`📍 ${item.name} (${item.key})`);
      console.log(`   時刻: ${item.timestamp}`);
      console.log(`   エラー: ${item.error}`);
      console.log('');
    }
  }

  // 動物0匹の施設表示（オプション）
  if (emptyList.length > 0 && emptyList.length <= 5) {
    console.log('='.repeat(70));
    console.log(`📭 動物0匹: ${emptyList.length}施設`);
    console.log('='.repeat(70));
    console.log('');

    for (const item of emptyList) {
      console.log(`📍 ${item.name} (${item.key})`);
      console.log(`   時刻: ${item.timestamp}`);
      console.log('');
    }
  } else if (emptyList.length > 5) {
    console.log('='.repeat(70));
    console.log(`📭 動物0匹: ${emptyList.length}施設（多数のため省略）`);
    console.log('='.repeat(70));
    console.log('');
  }

  // 総評
  console.log('='.repeat(70));
  console.log('📝 総評');
  console.log('='.repeat(70));
  console.log('');

  if (stats.success === stats.total) {
    console.log('✅ 全施設でスクレイピングが正常に完了しました。');
  } else if (stats.mismatch > 0) {
    console.log('⚠️  一部施設で動物数の不一致が検出されました。');
    console.log('   html-to-yaml.js のパース処理を確認してください。');
  }

  if (stats.error > 0) {
    console.log('❌ 一部施設でエラーが発生しました。');
    console.log('   各施設のscrape.jsを個別に実行して詳細を確認してください。');
  }

  console.log('');
  console.log('🔍 詳細確認:');
  console.log('   cat .claude/shelters-history.yaml | grep -A 20 "{key}"');
  console.log('');
}

main();
