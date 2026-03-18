# Tail Match - 運用ガイド

本ドキュメントは、全施設実装完了後の**日常運用手順**を記載します。

---

## 運用フェーズの概要

### 基本サイクル

```
毎日1回実行（推奨: 早朝3:00）
  ↓
① DB全削除
  ↓
② 全施設スクレイピング（HTML→YAML）
  ↓
③ YAML→DB投入
  ↓
④ 履歴記録（shelters-history.yaml更新）
  ↓
完了
```

---

## 日常運用手順

### 1. 手動実行（開発・テスト）

```bash
cd /path/to/tail-match

# 全施設自動スクレイピング＆DB更新
bash scripts/core/run-all-scrapers.sh
```

**実行時間**: 約20-30分（28施設 × 平均1分）

**ログ確認**:

```bash
ls -lt logs/scraping/ | head -5
cat logs/scraping/20251113_030000_full_run.log

# サマリーを表示
node scripts/core/show-scraping-summary.js
```

### 2. 自動実行（launchd + Claude異常検知）

macOS の launchd で毎日 AM 3:17 に自動実行する。異常が検知された場合のみ `claude -p` で診断・修復を行う。

#### セットアップ

```bash
# plist をインストール
cp scripts/core/launchd/com.kako-jun.tail-match-scrape.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.kako-jun.tail-match-scrape.plist

# 手動トリガー（テスト用）
launchctl start com.kako-jun.tail-match-scrape
```

#### 自動実行の流れ

```
launchd (毎日 AM 3:17)
  ↓
auto-scrape.sh [target]
  ├── run-all-scrapers.sh       ← 既存パイプライン（HTML→YAML→ローカルSQLite）
  ├── yaml-to-db.js             ← YAML→ローカルSQLite投入
  ├── sync-to-d1.js             ← ローカルSQLite→Cloudflare D1同期（本番DB）
  ├── check-anomalies.js        ← 異常検知（shelters-history.yaml を分析）
  │   ├── 異常なし → 静かに終了
  │   └── 異常あり → claude -p で修復依頼
  └── claude が壊れたセレクタを診断・修復
```

#### 対象の柔軟な指定

```bash
# 全施設（デフォルト）
bash scripts/core/auto-scrape.sh

# 県単位
bash scripts/core/auto-scrape.sh ishikawa

# 施設単位
bash scripts/core/auto-scrape.sh ishikawa/aigo-ishikawa
```

#### 異常検知の基準（check-anomalies.js）

| 異常パターン    | 閾値                     | 深刻度   |
| --------------- | ------------------------ | -------- |
| 連続0匹         | 直近3回連続              | critical |
| 高エラー率      | 直近5回中50%以上がエラー | critical |
| 最新実行エラー  | 直前1回がエラー          | warning  |
| 急激な件数減少  | 前回比50%以上減          | warning  |
| HTML→YAML不整合 | mismatch ステータス      | warning  |

#### ログ確認

```bash
# launchd のログ
tail -f /tmp/tail-match-scrape.log
cat /tmp/tail-match-scrape-err.log

# スクレイピング詳細ログ
ls -lt logs/scraping/ | head -5

# 異常検知を手動で確認
node scripts/core/check-anomalies.js
node scripts/core/check-anomalies.js --target ishikawa
```

#### freeza スキルとの連携

freeza リポジトリに `/scrape` スキルが定義されている。手動での操作はこちらを使う:

```
/scrape                          # 全施設スクレイピング
/scrape ishikawa                 # 県単位
/scrape ishikawa/aigo-ishikawa   # 施設単位
/scrape fix                      # 異常検知＋修復
/scrape status                   # 全施設の状態確認
```

#### 停止

```bash
launchctl unload ~/Library/LaunchAgents/com.kako-jun.tail-match-scrape.plist
```

---

## OCRセンター専用の追加手順

### 対象施設（完全自動化不可）

以下の3施設は**画像OCR方式**のため、通常の全国一括実行では完結しません:

1. **名古屋市動物愛護センター** (`aichi/nagoya-city`)
2. **堺市動物愛護センター** (`osaka/sakai-city-cats`)
3. **横浜市動物愛護センター** (`kanagawa/yokohama-city-cats`)

全国スクレイパー実行後: 猫のリスト・画像は取得済み、詳細データ（年齢・性別・毛色など）は**null**。

### OCR処理手順

#### 方法1: Google Cloud Vision API（推奨・無料）

```bash
# Vision API 設定（初回のみ）
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
npm install @google-cloud/vision

# OCR実行（月1,000リクエストまで無料）
node scripts/scrapers/aichi/nagoya-city/ocr-extract.js
# → data/ocr/aichi/nagoya-city/extracted_data.json が生成される

# YAML更新
node scripts/scrapers/aichi/nagoya-city/update-yaml-from-images.js

# DB投入
node scripts/core/yaml-to-db.js
```

#### 方法2: Claudeエージェントに依頼（手動）

```bash
# 画像を確認
ls -lt scripts/scrapers/aichi/nagoya-city/data/images/aichi/nagoya-city/*.jpg | head -10

# update-yaml-from-images.js の extractedData を手動更新
vim scripts/scrapers/aichi/nagoya-city/update-yaml-from-images.js

# YAML更新を実行
node scripts/scrapers/aichi/nagoya-city/update-yaml-from-images.js

# DB投入
node scripts/core/yaml-to-db.js
```

**注意**: 新しい猫が追加された場合、画像は自動ダウンロードされるがextractedDataへの追加は手動。月1回程度の最新化を推奨。

---

## 実行結果の確認

### 1. サマリー確認（最優先）

```bash
node scripts/core/show-scraping-summary.js
```

出力例:

```
📊 スクレイピング実行結果サマリー
対象施設数: 28施設
✅ 成功: 22施設 (79%)
❌ エラー: 0施設 (0%)
⚠️  不一致: 1施設 (4%)
📭 動物0匹: 5施設 (18%)
```

### 2. DB確認

```bash
# DB内の動物数を確認
sqlite3 data/tail-match.db "SELECT COUNT(*) FROM tails;"

# 施設別の動物数を確認
sqlite3 data/tail-match.db "SELECT m.name, COUNT(t.id) FROM municipalities m LEFT JOIN tails t ON m.id = t.municipality_id GROUP BY m.id;"
```

### 3. 履歴確認（詳細）

```bash
# 特定施設の履歴を確認
cat data/shelters-history.yaml | grep -A 15 "chiba/chiba-city-cats"

# 全施設の最新ステータス確認
cat data/shelters-history.yaml | grep -E "^  [a-z]|last_success|last_error" | head -60
```

確認ポイント: `verified`, `last_success`, `last_error`, `mismatch_count`, `last_10_runs[0].status`

### 4. エラー確認

```bash
cat data/shelters-history.yaml | grep -B 3 "status: error"
```

---

## トラブルシューティング

### パターン1: 特定施設のスクレイピング失敗

```bash
# 該当施設を単独で実行
cd scripts/scrapers/{prefecture}/{municipality}
node scrape.js
node html-to-yaml.js
```

### パターン2: HTML→YAML で動物数が減少

```
⚠️  [History Logger] HTML→YAMLで2匹減少 (20→18)
```

原因: HTMLパース処理のバグ、セレクタの変更、譲渡済み判定の誤作動

1. HTMLファイルを確認してセレクタを修正

### パターン3: YAML→DB で動物数が減少

```
⚠️  [History Logger] YAML→DBで3匹減少 (18→15)
```

原因: YAMLファイルの形式エラー、必須フィールド不足（external_id等）

```bash
node scripts/core/yaml-to-db.js 2>&1 | grep "ERROR\|WARNING"
```

### パターン4: 全施設で0匹

```bash
node scripts/core/yaml-to-db.js
```

### パターン5: 新規施設追加時のエラー

主なエラーパターン（詳細は `docs/common-mistakes.md` 参照）:

- `countAnimalsInHTML is not defined` - 関数定義忘れ
- `allAnimals is not defined` - 変数名ミス
- ディレクトリパスエラー - CONFIG設定ミス
- 全角・半角括弧の混在 - 正規表現パターン不足

---

## メンテナンス作業

### 新規施設追加時

1. **スクレイパー作成** (`docs/scraping.md` 参照)
2. **run-full-scrape.sh 作成** (他施設からコピー推奨)
3. **run-all-scrapers.sh 更新**:

```bash
# SCRAPERS配列に追加
SCRAPERS=(
  # ... 既存施設 ...
  "{prefecture}/{municipality}"
)
```

4. **履歴ロガー統合** (`docs/history-logging.md` 参照)

### ログファイルのローテーション

```bash
# 30日以上前のログを削除
find logs/scraping -name "*.log" -mtime +30 -delete
```

---

## セキュリティ

- **User-Agent**: `TailMatchBot/1.0 (Tail Match Animal Rescue Service; +https://tail-match.llll-ll.com; contact@tail-match.llll-ll.com)`
- **アクセス間隔**: 施設間5秒、ページ間3秒、リトライ間隔2秒
- **robots.txt**: すべての自治体サイトで確認済み

---

## エスカレーション

| レベル  | 範囲      | 対応                                         |
| ------- | --------- | -------------------------------------------- |
| レベル1 | 1-2施設   | 次回実行で自動復旧を待つ                     |
| レベル2 | 3-5施設   | 各施設を個別に手動実行、サイト構造変更を確認 |
| レベル3 | 6施設以上 | ネットワーク・Playwright・ディスク容量を確認 |

---

## 本番デプロイ（Cloudflare Pages + D1）

### 構成

```
ローカル (neo macOS)                    Cloudflare
┌─────────────────────┐           ┌──────────────────────────┐
│ launchd (AM 3:17)   │           │ Pages: tail-match        │
│   → スクレイパー28施設│           │   URL: tail-match.pages.dev │
│   → ローカルSQLite  │──sync──→  │ D1: tail-match-db        │
│   → sync-to-d1.js   │           │   547匹 (APAC)           │
│   → 異常検知        │           └──────────────────────────┘
│   → claude -p 修復  │
└─────────────────────┘
```

- **Web アプリ**: Cloudflare Pages（Next.js + @cloudflare/next-on-pages）
- **データベース**: Cloudflare D1（SQLite 互換、無料枠: 5GB / 500万読取・10万書込 per日）
- **D1 database_id**: `9ed5914c-6034-4393-a39a-26879638a7ee`
- **URL**: https://tail-match.pages.dev （カスタムドメイン: tail-match.llll-ll.com 設定予定）

### 手動デプロイ

```bash
cd ~/repos/2025/tail-match

# ビルド
npx @cloudflare/next-on-pages

# デプロイ
npx wrangler pages deploy .vercel/output/static --project-name tail-match
```

### D1 手動同期

```bash
# ローカルSQLite → D1
node scripts/core/sync-to-d1.js
```

### D1 確認

```bash
npx wrangler d1 execute tail-match-db --remote --command="SELECT COUNT(*) FROM tails;"
npx wrangler d1 execute tail-match-db --remote --command="SELECT animal_type, COUNT(*) FROM tails GROUP BY animal_type;"
```

---

## 現在の運用状況（2026-03-19時点）

```
対象施設数: 28施設
✅ 成功: 27施設 (96%)
❌ 失敗: 1施設
📊 D1投入: 547匹（欠損ゼロ）
🌐 本番URL: https://tail-match.pages.dev
```

### 将来の改善予定

1. ~~cron設定~~ → launchd + check-anomalies.js + claude -p で自動化済み
2. ~~デプロイ~~ → Cloudflare Pages + D1 で本番稼働中
3. カスタムドメイン tail-match.llll-ll.com の設定
4. 並列実行（現在は順次実行、5秒間隔）
5. 失敗施設の自動リトライ（最大3回）
6. 差分更新（DB全削除ではなく変更施設のみ更新）
7. OCR完全自動化（横浜市・堺市）
