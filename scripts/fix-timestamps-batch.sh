#!/bin/bash

# タイムスタンプを一括でJSTに変換するスクリプト

set -e

echo "============================================================"
echo "⏰ タイムスタンプ一括変換（UTC → JST）"
echo "============================================================"
echo ""

# 修正対象ファイルを取得
FILES=$(grep -l "new Date().toISOString()" scripts/scrapers/**/*.js 2>/dev/null | grep -v node_modules)

echo "📁 修正対象ファイル数: $(echo "$FILES" | wc -l)"
echo ""

# 各ファイルを修正
for file in $FILES; do
  echo "🔧 修正中: $file"

  # バックアップ作成
  cp "$file" "$file.bak"

  # 1. 長いパターンを先に置換（ファイル名用タイムスタンプ）
  # new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0]
  # → getJSTTimestamp()
  sed -i "s/new Date().toISOString().replace(\/\[-:\]\/g, '').replace('T', '_').split('.').\\[0\\]/getJSTTimestamp()/g" "$file"

  # 別のバリエーション（スラッシュなし）
  sed -i "s/new Date().toISOString().replace(\/\[-:\]\/g, '').replace('T', '_').split('.').\\[0\\]/getJSTTimestamp()/g" "$file"

  # toISOString().slice(0, 19) パターン
  sed -i "s/new Date().toISOString().slice(0, 19).replace(\/\[-:\]\/g, '').replace('T', '_')/getJSTTimestamp()/g" "$file"

  # 2. 短いパターンを置換（ISO文字列）
  # new Date().toISOString()
  # → getJSTISOString()
  sed -i "s/new Date().toISOString()/getJSTISOString()/g" "$file"

  # 3. インポート文を追加（まだない場合）
  if ! grep -q "from.*timestamp.js" "$file"; then
    # import文の位置を探す
    if grep -q "^import " "$file"; then
      # 最後のimport文の後に追加
      sed -i "/^import /a import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';" "$file"
      # 重複を削除（1つだけ残す）
      awk '!seen[$0]++ || !/timestamp\.js/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
  fi

  # バックアップ削除
  rm "$file.bak"

  echo "  ✅ 完了"
done

echo ""
echo "============================================================"
echo "✅ 一括変換完了"
echo "============================================================"
echo ""
echo "次のステップ:"
echo "  1. 動作確認: node scripts/scrapers/kanagawa/yokohama-city/scrape.js"
echo "  2. 確認: git diff"
echo ""
