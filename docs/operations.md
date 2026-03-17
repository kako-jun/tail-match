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

### 2. cron自動実行（本番環境）

```bash
crontab -e

# 毎日早朝3:00に実行（日本時間）
0 3 * * * cd /home/user/tail-match && bash scripts/core/run-all-scrapers.sh >> logs/cron.log 2>&1
```

**推奨時間帯**: 早朝3:00-5:00（自治体サイトのアクセスが少ない時間帯）

```bash
# cronログ確認
tail -f logs/cron.log
grep "全施設自動スクレイピング完了" logs/cron.log
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
cat .claude/shelters-history.yaml | grep -A 15 "chiba/chiba-city-cats"

# 全施設の最新ステータス確認
cat .claude/shelters-history.yaml | grep -E "^  [a-z]|last_success|last_error" | head -60
```

確認ポイント: `verified`, `last_success`, `last_error`, `mismatch_count`, `last_10_runs[0].status`

### 4. エラー確認

```bash
cat .claude/shelters-history.yaml | grep -B 3 "status: error"
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

| レベル | 範囲 | 対応 |
|--------|------|------|
| レベル1 | 1-2施設 | 次回実行で自動復旧を待つ |
| レベル2 | 3-5施設 | 各施設を個別に手動実行、サイト構造変更を確認 |
| レベル3 | 6施設以上 | ネットワーク・Playwright・ディスク容量を確認 |

---

## 現在の運用状況（2025-11-13時点）

```
対象施設数: 28施設
✅ 成功: 22施設 (79%)
❌ エラー: 0施設 (0%)
⚠️  不一致: 1施設 (4%)  ← いしかわ（19→18、許容範囲）
📭 動物0匹: 5施設 (18%) ← 正常（実際に0匹）
```

### 将来の改善予定

1. いしかわ動物愛護センターの不一致解消
2. 並列実行（現在は順次実行、5秒間隔）
3. 失敗施設の自動リトライ（最大3回）
4. 差分更新（DB全削除ではなく変更施設のみ更新）
5. OCR完全自動化（横浜市・堺市）
