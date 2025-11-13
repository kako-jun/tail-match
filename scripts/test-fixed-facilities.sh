#!/bin/bash

# ================================================================
# 修正した4施設のみテスト実行スクリプト
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "================================================================"
echo "🔧 修正した4施設のテスト実行"
echo "================================================================"
echo ""

# 修正した4施設
FIXED_FACILITIES=(
  "kanagawa/kanagawa-pref-dogs"
  "okinawa/okinawa-pref-cats"
  "toyama/toyama-pref-cats"
  "fukui/fukui-pref-dogs"
)

TOTAL=${#FIXED_FACILITIES[@]}
SUCCESS_COUNT=0
ERROR_COUNT=0

echo "📊 対象施設数: ${TOTAL}施設"
echo ""

for facility in "${FIXED_FACILITIES[@]}"; do
  echo "----------------------------------------"
  echo "📍 施設: $facility"
  echo "----------------------------------------"

  SCRAPER_DIR="scripts/scrapers/$facility"
  SCRAPER_SH="$SCRAPER_DIR/run-full-scrape.sh"

  if [ ! -f "$SCRAPER_SH" ]; then
    echo "⚠️  run-full-scrape.sh が存在しません"
    ERROR_COUNT=$((ERROR_COUNT + 1))
    continue
  fi

  if bash "$SCRAPER_SH"; then
    echo "✅ スクレイピング成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "❌ スクレイピング失敗"
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi

  echo ""
  sleep 2
done

echo "================================================================"
echo "📊 テスト結果"
echo "================================================================"
echo "  成功: ${SUCCESS_COUNT} / ${TOTAL}施設"
echo "  失敗: ${ERROR_COUNT}施設"
echo "================================================================"

if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ 全修正施設が成功！"
  exit 0
else
  echo "⚠️  まだエラーがあります"
  exit 1
fi
