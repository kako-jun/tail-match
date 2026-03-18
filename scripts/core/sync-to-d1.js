#!/usr/bin/env node

/**
 * ローカルSQLite → Cloudflare D1 同期
 *
 * better-sqlite3 でローカルDBを読み、
 * wrangler d1 execute --remote --command でバッチ送信する。
 * execFileSync でシェル解釈を回避し、引用符問題を完全に排除。
 */

import Database from 'better-sqlite3';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

const DB_PATH = path.join(PROJECT_ROOT, 'data/tail-match.db');
const D1_DB_NAME = 'tail-match-db';
const BATCH_SIZE = 20;

// npx wrangler のパスを解決
const WRANGLER = path.join(PROJECT_ROOT, 'node_modules/.bin/wrangler');

function wranglerExec(sql) {
  return execFileSync(WRANGLER, ['d1', 'execute', D1_DB_NAME, '--remote', `--command=${sql}`], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    timeout: 30000,
    stdio: 'pipe',
  });
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  // シングルクォートをエスケープ
  return `'${String(v).replace(/'/g, "''")}'`;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`ERROR: ${DB_PATH} が見つかりません`);
    process.exit(1);
  }

  if (!fs.existsSync(WRANGLER)) {
    console.error('ERROR: wrangler が見つかりません。npm install を実行してください');
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const totalCount = db.prepare('SELECT COUNT(*) as c FROM tails').get().c;
  console.log(`=== D1同期開始 (${totalCount}匹) ===`);

  // 1. D1 の tails をクリア
  console.log('[1/3] リモートD1のtailsをクリア...');
  wranglerExec('DELETE FROM tails;');

  // 2. バッチ送信
  console.log('[2/3] D1にデータ投入...');
  const rows = db.prepare('SELECT * FROM tails').all();
  const columns = Object.keys(rows[0] || {});
  let sent = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const statements = batch
      .map((row) => {
        const values = columns.map((col) => sqlValue(row[col]));
        return `INSERT OR REPLACE INTO tails (${columns.join(',')}) VALUES (${values.join(',')});`;
      })
      .join('\n');

    try {
      // execFileSync: シェル解釈なし、引用符問題なし
      wranglerExec(statements);
      sent += batch.length;
    } catch (e) {
      // バッチ失敗時は1行ずつリトライ
      for (const row of batch) {
        const values = columns.map((col) => sqlValue(row[col]));
        const stmt = `INSERT OR REPLACE INTO tails (${columns.join(',')}) VALUES (${values.join(',')});`;
        try {
          wranglerExec(stmt);
          sent++;
        } catch (e2) {
          errors++;
          console.error(`  ERROR: row ${row.id}: ${e2.message?.slice(0, 100)}`);
        }
      }
    }

    const progress = Math.min(i + BATCH_SIZE, rows.length);
    console.log(`  ${progress}/${totalCount}匹`);
  }

  db.close();

  // 3. 確認
  console.log('[3/3] 確認...');
  try {
    const output = wranglerExec('SELECT COUNT(*) as count FROM tails;');
    const match = output.match(/"count":\s*(\d+)/);
    if (match) {
      console.log(`  D1: ${match[1]}匹 (ローカル: ${totalCount}匹)`);
      if (parseInt(match[1]) !== totalCount) {
        console.error(`  WARNING: ${totalCount - parseInt(match[1])}匹の欠損あり`);
      }
    }
  } catch (e) {
    console.log('  確認スキップ');
  }

  console.log(`=== D1同期完了 (送信: ${sent}, エラー: ${errors}) ===`);
  if (errors > 0) {
    process.exit(1);
  }
}

main();
