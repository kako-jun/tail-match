#!/bin/bash

# ================================================================
# 堺市動物指導センター 完全自動スクレイピングスクリプト
# ================================================================
#
# 使用方法:
#   ./scripts/scrapers/osaka/sakai-city/run-full-scrape.sh
#
# 実行内容:
#   1. 索引ページから全ページURLを取得
#   2. 各ページのHTMLをスクレイピング
#   3. 全画像URLを抽出
#   4. 画像をダウンロード
#   5. YAMLテンプレートを生成
#   6. （手動）Claude Vision APIで画像情報を抽出
#
# ================================================================

set -e  # エラーで停止

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo "🐱 堺市動物指導センター - 完全自動スクレイピング"
echo "============================================================"
echo ""

# ================================================================
# Step 1: 索引ページから全ページURLを抽出
# ================================================================

echo "[Step 1] 索引ページから全ページURLを取得..."

INDEX_URL="https://www.city.sakai.lg.jp/kurashi/dobutsu/dogcat/inunekojoto/index.html"
PAGE_URLS=$(curl -k -s "$INDEX_URL" | \
  grep -o 'href="[^"]*\(cats\|centerdogs\)[^"]*\.html"' | \
  sed 's/href="//;s/"$//' | \
  sort -u)

echo "見つかったページ:"
echo "$PAGE_URLS" | while read -r url; do
  echo "  - https://www.city.sakai.lg.jp${url}"
done
echo ""

# ================================================================
# Step 2: 各ページのHTMLをスクレイピング
# ================================================================

echo "[Step 2] 各ページのHTMLをスクレイピング中..."

HTML_DIR="data/html/osaka/sakai-city"
mkdir -p "$HTML_DIR"

page_num=1
echo "$PAGE_URLS" | while read -r rel_url; do
  full_url="https://www.city.sakai.lg.jp${rel_url}"
  timestamp=$(date -u +"%Y%m%d_%H%M%S")

  # ファイル名決定
  if echo "$rel_url" | grep -q "cats1"; then
    filename="${timestamp}_cats1.html"
  elif echo "$rel_url" | grep -q "cats2"; then
    filename="${timestamp}_cats2.html"
  elif echo "$rel_url" | grep -q "cats3"; then
    filename="${timestamp}_cats3.html"
  elif echo "$rel_url" | grep -q "centerdogs"; then
    filename="${timestamp}_dogs.html"
  else
    filename="${timestamp}_page${page_num}.html"
  fi

  echo "  [$page_num] $full_url"

  # Playwrightでスクレイピング
  node -e "
    import('playwright').then(async ({ chromium }) => {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'TailMatch/1.0 (+https://tail-match.llll-ll.com) - 保護猫情報収集Bot'
      });
      const page = await context.newPage();
      await page.goto('${full_url}', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.waitForTimeout(3000);
      const html = await page.content();

      const fs = await import('fs');
      const path = await import('path');
      fs.writeFileSync('${HTML_DIR}/${filename}', html, 'utf-8');
      console.log('      ✅ 保存: ${filename} (' + html.length + ' 文字)');

      await browser.close();
    });
  "

  page_num=$((page_num + 1))
  sleep 2  # サーバー負荷軽減
done

echo ""

# ================================================================
# Step 3: 全画像URLを抽出
# ================================================================

echo "[Step 3] 全画像URLを抽出中..."

IMAGE_URLS=$(grep -oh '\(cats[0-9]\|centerdogs\)\.images/[^"]*\.png' "$HTML_DIR"/*.html 2>/dev/null | sort -u || true)

if [ -z "$IMAGE_URLS" ]; then
  echo "  ⚠️  画像URLが見つかりませんでした"
  exit 1
fi

image_count=$(echo "$IMAGE_URLS" | wc -l)
echo "  見つかった画像: ${image_count}枚"
echo "$IMAGE_URLS" | head -5
if [ "$image_count" -gt 5 ]; then
  echo "  ... (残り $((image_count - 5))枚)"
fi
echo ""

# ================================================================
# Step 4: 画像をダウンロード
# ================================================================

echo "[Step 4] 画像をダウンロード中..."

IMAGE_DIR="data/images/osaka/sakai-city"
mkdir -p "$IMAGE_DIR"

downloaded=0
echo "$IMAGE_URLS" | while read -r img_path; do
  if [ -n "$img_path" ]; then
    filename=$(basename "$img_path")
    full_url="https://www.city.sakai.lg.jp/kurashi/dobutsu/dogcat/inunekojoto/${img_path}"

    curl -k -s -o "${IMAGE_DIR}/${filename}" "$full_url"

    if [ -f "${IMAGE_DIR}/${filename}" ]; then
      size=$(du -h "${IMAGE_DIR}/${filename}" | cut -f1)
      echo "    ✅ ${filename} (${size})"
      downloaded=$((downloaded + 1))
    else
      echo "    ❌ ${filename} - ダウンロード失敗"
    fi

    sleep 1  # サーバー負荷軽減
  fi
done

echo "  ダウンロード完了: ${downloaded}/${image_count}枚"
echo ""

# ================================================================
# Step 5: YAMLテンプレート生成
# ================================================================

echo "[Step 5] YAMLテンプレート生成中..."

node "$SCRIPT_DIR/extract-from-images.js"

echo ""

# ================================================================
# 完了
# ================================================================

echo "============================================================"
echo "✅ 自動スクレイピング完了"
echo "============================================================"
echo ""
echo "次のステップ:"
echo "  1. data/images/osaka/sakai-city/ の画像を確認"
echo "  2. Claude に画像を見せて情報を抽出"
echo "  3. YAMLファイルを更新"
echo "  4. データベースに投入:"
echo "     node scripts/yaml-to-db.js"
echo ""
