#!/bin/bash

# ================================================================
# html-to-yaml.js ファイルにロガー統合を追加するスクリプト
# ================================================================
#
# 実行内容:
#   1. const logger = createLogger(...) の後に logger.start() と loadPreviousCounts() を追加
#   2. logger.logYAMLCount() の後に logger.finalize() を追加
#   3. catch ブロックの logger.logError() の後に logger.finalize() を追加
#
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🔧 html-to-yaml.js ロガー統合更新スクリプト"
echo "=" * 60

# 既に logger.start() がある施設はスキップリストに追加
SKIP_LIST=(
  "chiba/chiba-city-cats"
)

# html-to-yaml.js ファイルを検索
find scripts/scrapers -name "html-to-yaml.js" | while read -r file; do
  dir=$(dirname "$file")
  parent=$(basename $(dirname "$dir"))
  name=$(basename "$dir")
  municipality="$parent/$name"

  # スキップリストチェック
  skip=false
  for skip_item in "${SKIP_LIST[@]}"; do
    if [ "$municipality" = "$skip_item" ]; then
      skip=true
      break
    fi
  done

  if [ "$skip" = true ]; then
    echo "⏭️  スキップ: $municipality (既に統合済み)"
    continue
  fi

  # logger.start() が既にあるかチェック
  if grep -q "logger.start()" "$file"; then
    echo "⏭️  スキップ: $municipality (logger.start()既存)"
    continue
  fi

  echo "🔧 更新中: $municipality"

  # バックアップ作成
  cp "$file" "$file.bak"

  # Node.js で編集
  node -e "
    const fs = require('fs');
    const filePath = '$file';
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. const logger = createLogger の後に start() と loadPreviousCounts() を追加
    content = content.replace(
      /(const logger = createLogger\([^)]+\);)/,
      '\$1\n  logger.start();\n  logger.loadPreviousCounts(); // 前ステップのカウントを継承'
    );

    // 2. logger.logYAMLCount() の後に finalize() を追加（成功パス）
    // パターン: logger.logYAMLCount(...);  の後に logger.finalize(); がない場合
    if (!content.includes('logger.finalize()')) {
      // 最後の console.log の前に finalize() を挿入
      content = content.replace(
        /(logger\.logYAMLCount\([^)]+\);[\s\S]*?)(console\.log\(['\\\\\`].*?(?:完了|success|Success).*?['\\\\\`]\))/,
        '\$1\n    logger.finalize(); // 履歴を保存\n\n    \$2'
      );
    }

    // 3. catch ブロックの logger.logError() の後に finalize() を追加
    content = content.replace(
      /(logger\.logError\(.*?\);)/g,
      '\$1\n    logger.finalize(); // エラー時も履歴を保存'
    );

    fs.writeFileSync(filePath, content, 'utf-8');
  "

  if [ $? -eq 0 ]; then
    echo "   ✅ 更新成功"
    rm "$file.bak"
  else
    echo "   ❌ 更新失敗、バックアップから復元"
    mv "$file.bak" "$file"
  fi
done

echo ""
echo "=" * 60
echo "✅ ロガー統合更新完了"
echo "=" * 60
