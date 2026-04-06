#!/bin/bash

# ================================================================
# Tail Match - 自動スクレイピング＋異常検知
# ================================================================
#
# 使い方:
#   bash scripts/core/auto-scrape.sh              # 全施設
#   bash scripts/core/auto-scrape.sh ishikawa      # 県単位
#   bash scripts/core/auto-scrape.sh ishikawa/aigo-ishikawa  # 施設単位
#
# cron/launchd から呼ばれることを想定。
# 異常がなければ静かに終了。異常時はレポートを出力して exit 1。
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

TARGET="${1:-}"  # 空なら全施設
LOG_DIR="logs/scraping"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/${TIMESTAMP}_auto.log"

# ================================================================
# Step 1: スクレイピング実行
# ================================================================

log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== auto-scrape 開始 (target: ${TARGET:-all}) ==="

if [ -z "$TARGET" ]; then
  # 全施設: 既存の run-all-scrapers.sh を使う
  log "全施設スクレイピング開始"
  bash "$SCRIPT_DIR/run-all-scrapers.sh" >> "$LOG_FILE" 2>&1
  SCRAPE_EXIT=$?
else
  # 対象を絞って実行
  # TARGET が県名なら、その県のスクレイパーを全部実行
  # TARGET が県/施設なら、その施設だけ実行
  FOUND=0

  if [[ "$TARGET" == */* ]]; then
    # 施設単位
    SCRAPER_SH="scripts/scrapers/$TARGET/run-full-scrape.sh"
    if [ -f "$SCRAPER_SH" ]; then
      log "施設スクレイピング: $TARGET"
      bash "$SCRAPER_SH" >> "$LOG_FILE" 2>&1
      SCRAPE_EXIT=$?
      FOUND=1
    fi
  else
    # 県単位: scripts/scrapers/{TARGET}/ 以下を全部実行
    PREF_DIR="scripts/scrapers/$TARGET"
    if [ -d "$PREF_DIR" ]; then
      SCRAPE_EXIT=0
      for facility_dir in "$PREF_DIR"/*/; do
        facility_name="$(basename "$facility_dir")"
        scraper_sh="$facility_dir/run-full-scrape.sh"
        if [ -f "$scraper_sh" ]; then
          log "施設スクレイピング: $TARGET/$facility_name"
          bash "$scraper_sh" >> "$LOG_FILE" 2>&1 || SCRAPE_EXIT=1
          FOUND=1
          sleep 5  # サーバー負荷軽減
        fi
      done
    fi
  fi

  if [ "$FOUND" -eq 0 ]; then
    log "ERROR: 対象が見つかりません: $TARGET"
    exit 2
  fi
fi

log "スクレイピング完了 (exit: ${SCRAPE_EXIT:-0})"

# ================================================================
# Step 2: YAML→DB投入（全施設実行時のみ）
# ================================================================

if [ -z "$TARGET" ]; then
  log "YAML→DB投入"
  node scripts/core/yaml-to-db.js >> "$LOG_FILE" 2>&1

  log "D1同期（ローカルSQLite → Cloudflare D1）"
  node "$SCRIPT_DIR/sync-to-d1.js" >> "$LOG_FILE" 2>&1 || log "WARNING: D1同期に失敗しました"
fi

# ================================================================
# Step 3: 異常検知
# ================================================================

log "異常検知開始"

ANOMALY_ARGS=""
if [ -n "$TARGET" ]; then
  ANOMALY_ARGS="--target $TARGET"
fi

ANOMALY_OUTPUT=$(node scripts/core/check-anomalies.js $ANOMALY_ARGS 2>> "$LOG_FILE")
ANOMALY_EXIT=$?

if [ "$ANOMALY_EXIT" -eq 0 ]; then
  log "異常なし。正常終了。"
  exit 0
fi

if [ "$ANOMALY_EXIT" -eq 2 ]; then
  log "ERROR: 異常検知スクリプト自体がエラー"
  exit 2
fi

# ================================================================
# Step 4: 異常あり → レポート出力
# ================================================================

ANOMALY_COUNT=$(echo "$ANOMALY_OUTPUT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  console.log(data.anomaly_count);
" 2>/dev/null || echo "?")

log "異常検知: ${ANOMALY_COUNT}件の施設に問題あり"
log "異常レポート:"
echo "$ANOMALY_OUTPUT" >> "$LOG_FILE"
log "修復が必要です。claude code で対応してください。"

log "=== auto-scrape 終了 ==="
exit 1
