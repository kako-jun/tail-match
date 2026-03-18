#!/usr/bin/env node

/**
 * スクレイピング異常検知
 *
 * shelters-history.yaml を読んで異常な施設を検出する。
 * 異常があればJSON形式で出力し、exit code 1 で終了する。
 * 異常がなければ何も出力せず exit code 0。
 *
 * 使い方:
 *   node scripts/core/check-anomalies.js
 *   node scripts/core/check-anomalies.js --target ishikawa
 *   node scripts/core/check-anomalies.js --target ishikawa/aigo-ishikawa
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');
const HISTORY_FILE = path.join(PROJECT_ROOT, 'data/shelters-history.yaml');

// 異常判定の閾値
const THRESHOLDS = {
  // 直近N回連続で0匹なら異常
  consecutiveZeroRuns: 3,
  // 直近N回中のエラー率がこれを超えたら異常
  errorRateThreshold: 0.5,
  // 直近N回を見る
  recentRunsWindow: 5,
  // 前回と比較してこの割合以上減少したら警告
  dropRatioThreshold: 0.5,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { target: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      result.target = args[i + 1];
      i++;
    }
  }

  return result;
}

function matchesTarget(scraperId, target) {
  if (!target) return true;
  // "ishikawa" → "ishikawa/" で始まるものすべて
  // "ishikawa/aigo-ishikawa" → 完全一致
  if (scraperId === target) return true;
  if (scraperId.startsWith(target + '/')) return true;
  return false;
}

function detectAnomalies(scrapers, target) {
  const anomalies = [];

  for (const [scraperId, scraper] of Object.entries(scrapers)) {
    if (!matchesTarget(scraperId, target)) continue;

    const runs = scraper.last_10_runs || [];
    if (runs.length === 0) continue;

    const recentRuns = runs.slice(0, THRESHOLDS.recentRunsWindow);
    const issues = [];

    // 1. 直近の連続0匹チェック
    let consecutiveZeros = 0;
    for (const run of recentRuns) {
      if (run.yaml_count === 0 && run.status !== 'error') {
        consecutiveZeros++;
      } else {
        break;
      }
    }
    if (consecutiveZeros >= THRESHOLDS.consecutiveZeroRuns) {
      issues.push({
        type: 'consecutive_zero',
        message: `直近${consecutiveZeros}回連続で0匹`,
        severity: 'critical',
      });
    }

    // 2. エラー率チェック
    const errorRuns = recentRuns.filter((r) => r.status === 'error');
    const errorRate = errorRuns.length / recentRuns.length;
    if (errorRate >= THRESHOLDS.errorRateThreshold && recentRuns.length >= 2) {
      issues.push({
        type: 'high_error_rate',
        message: `直近${recentRuns.length}回中${errorRuns.length}回エラー (${(errorRate * 100).toFixed(0)}%)`,
        severity: 'critical',
        lastError: scraper.last_error_message,
      });
    }

    // 3. 最新実行がエラー
    if (runs[0].status === 'error') {
      issues.push({
        type: 'latest_error',
        message: `最新の実行がエラー: ${runs[0].error_message}`,
        severity: 'warning',
      });
    }

    // 4. 急激な件数減少（前回比）
    if (runs.length >= 2) {
      const current = runs[0].yaml_count || 0;
      const previous = runs[1].yaml_count || 0;
      if (previous > 0 && current < previous * (1 - THRESHOLDS.dropRatioThreshold)) {
        issues.push({
          type: 'sudden_drop',
          message: `件数が急減 (${previous}→${current}匹、${(((previous - current) / previous) * 100).toFixed(0)}%減)`,
          severity: 'warning',
        });
      }
    }

    // 5. mismatch（HTML→YAML変換で大量ロス）
    if (runs[0].status === 'mismatch') {
      issues.push({
        type: 'mismatch',
        message: `HTML→YAML変換で不整合: ${runs[0].warning}`,
        severity: 'warning',
      });
    }

    if (issues.length > 0) {
      anomalies.push({
        scraper_id: scraperId,
        name: scraper.name,
        issues,
        latest_run: runs[0],
        recent_counts: recentRuns.map((r) => ({
          date: r.timestamp,
          yaml_count: r.yaml_count,
          status: r.status,
        })),
      });
    }
  }

  return anomalies;
}

function main() {
  const { target } = parseArgs();

  if (!fs.existsSync(HISTORY_FILE)) {
    console.error('shelters-history.yaml が見つかりません');
    process.exit(2);
  }

  const historyData = yaml.load(fs.readFileSync(HISTORY_FILE, 'utf8'));
  const anomalies = detectAnomalies(historyData.scrapers, target);

  if (anomalies.length === 0) {
    // 正常 — 何も出力しない
    process.exit(0);
  }

  // 異常あり — JSON出力
  const report = {
    checked_at: new Date().toISOString(),
    target: target || 'all',
    anomaly_count: anomalies.length,
    anomalies,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

main();
