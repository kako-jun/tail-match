#!/usr/bin/env node

/**
 * 全施設用の run-full-scrape.sh ラッパーを自動生成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 全施設リスト（run-all-scrapers.sh から）
const FACILITIES = [
  // 千葉
  { path: 'chiba/chiba-city-cats', name: '千葉市動物保護指導センター（猫）' },
  { path: 'chiba/chiba-city-dogs', name: '千葉市動物保護指導センター（犬）' },
  { path: 'chiba/chiba-pref-cats', name: '千葉県動物愛護センター（猫）' },
  { path: 'chiba/chiba-pref-dogs', name: '千葉県動物愛護センター（犬）' },

  // 北海道
  { path: 'hokkaido/hokkaido-pref', name: '北海道動物愛護センター' },
  { path: 'hokkaido/sapporo-city-cats', name: '札幌市動物管理センター（猫）' },

  // 兵庫
  { path: 'hyogo/hyogo-pref-cats', name: '兵庫県動物愛護センター（猫）' },
  { path: 'hyogo/kobe-city', name: '神戸市動物管理センター' },

  // 石川
  { path: 'ishikawa/aigo-ishikawa', name: 'いしかわ動物愛護センター' },
  { path: 'ishikawa/kanazawa-city-cats', name: '金沢市動物愛護管理センター（猫）' },

  // 神奈川
  { path: 'kanagawa/kanagawa-pref-cats', name: '神奈川県動物愛護センター（猫）' },
  { path: 'kanagawa/kanagawa-pref-dogs', name: '神奈川県動物愛護センター（犬）' },
  { path: 'kanagawa/yokohama-city-cats', name: '横浜市動物愛護センター（猫）' },

  // 京都
  { path: 'kyoto/kyoto-pref-cats', name: '京都府動物愛護管理センター（猫）' },
  { path: 'kyoto/kyoto-pref-dogs', name: '京都府動物愛護管理センター（犬）' },

  // 沖縄
  { path: 'okinawa/naha-city', name: '那覇市動物愛護管理センター' },
  { path: 'okinawa/okinawa-pref-cats', name: '沖縄県動物愛護管理センター（猫）' },
  { path: 'okinawa/okinawa-pref-dogs', name: '沖縄県動物愛護管理センター（犬）' },

  // 大阪
  { path: 'osaka/osaka-city-cats', name: '大阪市動物管理センター（猫）' },
  { path: 'osaka/osaka-pref-cats', name: '大阪府動物愛護管理センター（猫）' },
  { path: 'osaka/sakai-city-cats', name: '堺市動物指導センター（猫）' },

  // 埼玉
  { path: 'saitama/saitama-city-cats', name: 'さいたま市動物愛護ふれあいセンター（猫）' },
  { path: 'saitama/saitama-pref-cats', name: '埼玉県動物指導センター（猫）' },

  // 東京
  { path: 'tokyo/tokyo-metro-cats', name: '東京都動物愛護相談センター（猫）' },

  // 富山
  { path: 'toyama/toyama-pref-cats', name: '富山県動物管理センター（猫）' },
  { path: 'toyama/toyama-pref-dogs', name: '富山県動物管理センター（犬）' },

  // 福井
  { path: 'fukui/fukui-pref-cats', name: '福井県動物愛護センター（猫）' },
  { path: 'fukui/fukui-pref-dogs', name: '福井県動物愛護センター（犬）' },
];

function generateShWrapper(facility) {
  const { path: facilityPath, name: facilityName } = facility;
  const [region, municipality] = facilityPath.split('/');

  return `#!/bin/bash

# ================================================================
# ${facilityName} 完全自動スクレイピングスクリプト
# ================================================================
#
# 使用方法:
#   ./scripts/scrapers/${facilityPath}/run-full-scrape.sh
#
# 実行内容:
#   1. HTMLをスクレイピング
#   2. HTMLからYAMLに情報を抽出
#
# ================================================================

set -e  # エラーで停止

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo "🐱 ${facilityName} - 完全自動スクレイピング"
echo "============================================================"
echo ""

# ================================================================
# Step 1: HTMLをスクレイピング
# ================================================================

echo "[Step 1] HTMLをスクレイピング中..."

node "$SCRIPT_DIR/scrape.js"

echo ""

# ================================================================
# Step 2: HTMLからYAMLに抽出
# ================================================================

echo "[Step 2] HTMLからYAMLに情報を抽出中..."

node "$SCRIPT_DIR/html-to-yaml.js"

echo ""

# ================================================================
# 完了
# ================================================================

echo "============================================================"
echo "✅ 自動スクレイピング完了"
echo "============================================================"
echo ""
echo "次のステップ:"
echo "  1. data/yaml/${facilityPath}/ のYAMLファイルを確認"
echo "  2. データベースに投入:"
echo "     node scripts/yaml-to-db.js"
echo ""
`;
}

function main() {
  console.log('🔧 run-full-scrape.sh ラッパー自動生成');
  console.log('='.repeat(60));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const facility of FACILITIES) {
    const facilityDir = path.join(__dirname, 'scrapers', facility.path);
    const shPath = path.join(facilityDir, 'run-full-scrape.sh');

    // 既存の.shファイルがある場合はスキップ
    if (fs.existsSync(shPath)) {
      console.log(`⏭️  スキップ: ${facility.path} (既存)`);
      skipped++;
      continue;
    }

    try {
      const shContent = generateShWrapper(facility);
      fs.writeFileSync(shPath, shContent, { mode: 0o755 });
      console.log(`✅ 作成: ${facility.path}`);
      created++;
    } catch (error) {
      console.error(`❌ エラー: ${facility.path} - ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 生成結果');
  console.log('='.repeat(60));
  console.log(`  作成: ${created}個`);
  console.log(`  スキップ: ${skipped}個`);
  console.log(`  エラー: ${errors}個`);
  console.log('='.repeat(60));

  if (errors > 0) {
    console.log('\n⚠️  一部のファイルでエラーが発生しました');
    process.exit(1);
  }

  console.log('\n✅ 全ファイルの生成完了');
}

main();
