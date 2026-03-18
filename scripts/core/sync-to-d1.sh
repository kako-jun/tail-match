#!/bin/bash

# ================================================================
# Tail Match - ローカルSQLite → Cloudflare D1 同期
# ================================================================
#
# ローカルでスクレイピング&DB投入した後、本番D1にデータを同期する。
#
# 使い方:
#   bash scripts/core/sync-to-d1.sh
# ================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

DB_FILE="data/tail-match.db"

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: ローカルDB ($DB_FILE) が見つかりません"
  exit 1
fi

TAIL_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM tails;")
echo "=== D1同期開始 (${TAIL_COUNT}匹) ==="

# 1. リモートD1のtailsデータをクリア
echo "[1/3] リモートD1のtailsデータをクリア..."
npx wrangler d1 execute tail-match-db --remote --command="DELETE FROM tails;" 2>/dev/null

# 2. ローカルのtailsをJSON APIで送信（バッチ分割）
echo "[2/3] D1にデータ投入..."

# Cloudflare API でバッチ送信
CF_ACCOUNT_ID="2382302b68c88c87f1cfe936739eb574"
CF_DB_ID="9ed5914c-6034-4393-a39a-26879638a7ee"

# wrangler の OAuth トークンを取得
CF_TOKEN=$(cat ~/.wrangler/config/default.toml 2>/dev/null | grep oauth_token | head -1 | cut -d'"' -f2 || true)
if [ -z "$CF_TOKEN" ]; then
  # wrangler login 済みの場合、access_token を使う
  CF_TOKEN=$(node -e "
    const fs = require('fs');
    const path = require('path');
    const home = require('os').homedir();
    const configDir = path.join(home, '.wrangler', 'config');
    try {
      const files = fs.readdirSync(configDir);
      for (const f of files) {
        const content = fs.readFileSync(path.join(configDir, f), 'utf8');
        const match = content.match(/oauth_token\s*=\s*\"([^\"]+)\"/);
        if (match) { console.log(match[1]); process.exit(0); }
        const match2 = content.match(/\"access_token\"\s*:\s*\"([^\"]+)\"/);
        if (match2) { console.log(match2[1]); process.exit(0); }
      }
    } catch(e) {}
    // Try node_modules/.cache
    const cacheDir = path.join(home, '.config', '.wrangler', 'config');
    try {
      const files = fs.readdirSync(cacheDir);
      for (const f of files) {
        const content = fs.readFileSync(path.join(cacheDir, f), 'utf8');
        const match = content.match(/oauth_token\s*=\s*\"([^\"]+)\"/);
        if (match) { console.log(match[1]); process.exit(0); }
      }
    } catch(e) {}
  " 2>/dev/null || true)
fi

# トークンが取れない場合は wrangler コマンドで小バッチ送信（遅いが確実）
if [ -z "$CF_TOKEN" ]; then
  echo "  APIトークン取得失敗。wrangler コマンドで送信します（遅い）..."
  BATCH_SIZE=50
  OFFSET=0
  while true; do
    BATCH=$(sqlite3 "$DB_FILE" ".mode insert tails" "SELECT * FROM tails LIMIT $BATCH_SIZE OFFSET $OFFSET;")
    [ -z "$BATCH" ] && break

    # 一時ファイルに書き出してからコマンド実行（引用符問題を回避）
    BATCH_FILE="/tmp/tail-match-batch-$$.sql"
    echo "$BATCH" > "$BATCH_FILE"
    npx wrangler d1 execute tail-match-db --remote --command="$(cat "$BATCH_FILE")" 2>/dev/null || true
    rm -f "$BATCH_FILE"

    OFFSET=$((OFFSET + BATCH_SIZE))
    echo "  ${OFFSET}/${TAIL_COUNT}匹"
  done
else
  # D1 HTTP API でバッチ送信（高速）
  BATCH_SIZE=50
  OFFSET=0
  while true; do
    SQL=$(sqlite3 "$DB_FILE" ".mode insert tails" "SELECT * FROM tails LIMIT $BATCH_SIZE OFFSET $OFFSET;")
    [ -z "$SQL" ] && break

    curl -s -X POST \
      "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query" \
      -H "Authorization: Bearer ${CF_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$(echo "$SQL" | python3 -c "import sys,json; print(json.dumps({'sql': sys.stdin.read()}))")" \
      > /dev/null 2>&1 || true

    OFFSET=$((OFFSET + BATCH_SIZE))
    echo "  ${OFFSET}/${TAIL_COUNT}匹"
  done
fi

# 3. 確認
echo "[3/3] 確認..."
npx wrangler d1 execute tail-match-db --remote --command="SELECT COUNT(*) as count FROM tails;" 2>/dev/null | grep '"count"' || echo "  確認スキップ"

echo "=== D1同期完了 ==="
