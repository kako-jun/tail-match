#!/bin/bash

# ================================================================
# Tail Match - 全施設自動スクレイピング＆DB更新スクリプト
# ================================================================
#
# 使用方法:
#   bash scripts/run-all-scrapers.sh
#
# 実行内容:
#   1. DB初期化（全データ削除）
#   2. 全施設のスクレイピング（HTML収集→YAML抽出）
#   3. YAML→DB投入
#   4. 履歴記録
#
# ================================================================

set -e  # エラーで停止

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ================================================================
# 設定
# ================================================================

LOG_DIR="logs/scraping"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/${TIMESTAMP}_full_run.log"

# 実行ログ開始
exec > >(tee -a "$LOG_FILE") 2>&1

echo "================================================================"
echo "🤖 Tail Match - 全施設自動スクレイピング開始"
echo "================================================================"
echo "開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "ログファイル: $LOG_FILE"
echo "================================================================"
echo ""

# ================================================================
# 全施設リスト（全28施設）
# ================================================================

SCRAPERS=(
  # 千葉
  "chiba/chiba-city-cats"
  "chiba/chiba-city-dogs"
  "chiba/chiba-pref-cats"
  "chiba/chiba-pref-dogs"

  # 北海道
  "hokkaido/hokkaido-pref"
  "hokkaido/sapporo-city-cats"

  # 兵庫
  "hyogo/hyogo-pref-cats"
  "hyogo/kobe-city"

  # 石川
  "ishikawa/aigo-ishikawa"
  "ishikawa/kanazawa-city-cats"

  # 神奈川
  "kanagawa/kanagawa-pref-cats"
  "kanagawa/kanagawa-pref-dogs"
  "kanagawa/yokohama-city-cats"

  # 京都
  "kyoto/kyoto-pref-cats"
  "kyoto/kyoto-pref-dogs"

  # 沖縄
  "okinawa/naha-city"
  "okinawa/okinawa-pref-cats"
  "okinawa/okinawa-pref-dogs"

  # 大阪
  "osaka/osaka-city-cats"
  "osaka/osaka-pref-cats"
  "osaka/sakai-city-cats"

  # 埼玉
  "saitama/saitama-city-cats"
  "saitama/saitama-pref-cats"

  # 東京
  "tokyo/tokyo-metro-cats"

  # 富山
  "toyama/toyama-pref-cats"
  "toyama/toyama-pref-dogs"

  # 福井
  "fukui/fukui-pref-cats"
  "fukui/fukui-pref-dogs"
)

TOTAL_SCRAPERS=${#SCRAPERS[@]}
echo "📊 対象施設数: ${TOTAL_SCRAPERS}施設（全施設統一.shラッパー呼び出し）"
echo ""

# ================================================================
# Step 0: DB初期化
# ================================================================

echo "================================================================"
echo "[Step 0] データベース初期化"
echo "================================================================"
echo ""

DB_FILE="data/tail-match.db"

if [ -f "$DB_FILE" ]; then
  echo "🗑️  既存のDBを削除: $DB_FILE"
  rm "$DB_FILE"
fi

echo "✅ DB初期化完了（次回のyaml-to-db.js実行時に再作成されます）"
echo ""

# ================================================================
# Step 1: 全施設スクレイピング
# ================================================================

echo "================================================================"
echo "[Step 1] 全施設スクレイピング（HTML収集→YAML抽出）"
echo "================================================================"
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0
SKIPPED_COUNT=0

for scraper in "${SCRAPERS[@]}"; do
  echo "----------------------------------------"
  echo "📍 施設: $scraper"
  echo "----------------------------------------"

  SCRAPER_DIR="scripts/scrapers/$scraper"
  SCRAPER_SH="$SCRAPER_DIR/run-full-scrape.sh"

  if [ ! -d "$SCRAPER_DIR" ]; then
    echo "⚠️  ディレクトリが存在しません: $SCRAPER_DIR"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    continue
  fi

  # 統一インターフェース: run-full-scrape.sh を呼び出し
  if [ -f "$SCRAPER_SH" ]; then
    if bash "$SCRAPER_SH"; then
      echo "✅ スクレイピング成功"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo "❌ スクレイピング失敗"
      ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
  else
    echo "⚠️  run-full-scrape.sh が存在しません: $SCRAPER_SH"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  fi

  echo ""

  # サーバー負荷軽減（5秒待機）
  sleep 5
done

echo "================================================================"
echo "📊 スクレイピング結果"
echo "================================================================"
echo "  成功: ${SUCCESS_COUNT} / ${TOTAL_SCRAPERS}施設"
echo "  失敗: ${ERROR_COUNT}施設"
echo "  スキップ: ${SKIPPED_COUNT}施設"
echo ""

# ================================================================
# Step 2: YAML→DB投入
# ================================================================

echo "================================================================"
echo "[Step 2] YAML→DB投入"
echo "================================================================"
echo ""

if node scripts/yaml-to-db.js; then
  echo "✅ DB投入成功"
else
  echo "❌ DB投入失敗"
  exit 1
fi

echo ""

# ================================================================
# Step 3: 実行結果サマリー表示
# ================================================================

echo "================================================================"
echo "[Step 3] 実行結果サマリー"
echo "================================================================"
echo ""

node scripts/show-scraping-summary.js

# ================================================================
# 完了
# ================================================================

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "================================================================"
echo "✅ 全施設自動スクレイピング完了"
echo "================================================================"
echo "開始時刻: $(date '+%Y-%m-%d %H:%M:%S' -d @$(stat -c %Y "$LOG_FILE"))"
echo "完了時刻: $END_TIME"
echo "ログファイル: $LOG_FILE"
echo ""
echo "📊 スクレイピング結果:"
echo "  - 成功: ${SUCCESS_COUNT} / ${TOTAL_SCRAPERS}施設"
echo "  - 失敗: ${ERROR_COUNT}施設"
echo "  - スキップ: ${SKIPPED_COUNT}施設"
echo ""
echo "🔍 確認方法:"
echo "  - ログ: cat $LOG_FILE"
echo "  - DB: sqlite3 data/tail-match.db 'SELECT COUNT(*) FROM tails;'"
echo "  - 履歴: cat \$PROJECT_ROOT/.claude/shelters-history.yaml"
echo "  - サマリー再表示: node scripts/show-scraping-summary.js"
echo ""
