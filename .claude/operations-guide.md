# Tail Match - 運用ガイド

本ドキュメントは、全施設実装完了後の**日常運用手順**を記載します。

## 📚 関連ドキュメント

- **[CLAUDE.md](../CLAUDE.md)** - プロジェクト全体の状況管理
- **[scraping-architecture.md](./scraping-architecture.md)** - スクレイピング設計思想
- **[scraping-guide.md](./scraping-guide.md)** - 新規施設追加手順
- **[history-logger-guide.md](./history-logger-guide.md)** - 履歴ロガー統合方法

---

## 🎯 運用フェーズの概要

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

### 実行環境

- **手動実行**: 開発環境・テスト用
- **cron自動実行**: 本番環境用

---

## 🚀 日常運用手順

### 1. 手動実行（開発・テスト）

```bash
# プロジェクトルートで実行
cd /path/to/tail-match

# 全施設自動スクレイピング＆DB更新
bash scripts/run-all-scrapers.sh
```

**実行時間**: 約20-30分（26施設 × 平均1分）

**ログ確認**:

```bash
# 最新のログを確認
ls -lt logs/scraping/ | head -5
cat logs/scraping/20251113_030000_full_run.log
```

### 2. cron自動実行（本番環境）

#### 2-1. cron設定

```bash
# crontab編集
crontab -e

# 毎日早朝3:00に実行（日本時間）
0 3 * * * cd /home/user/tail-match && bash scripts/run-all-scrapers.sh >> logs/cron.log 2>&1
```

**推奨時間帯**:

- **早朝3:00-5:00**: 自治体サイトのアクセスが少ない時間帯
- **深夜2:00-4:00**: サーバー負荷が低い時間帯

#### 2-2. cron実行確認

```bash
# cronログ確認
tail -f logs/cron.log

# 実行履歴確認
grep "全施設自動スクレイピング完了" logs/cron.log
```

---

## 📊 実行結果の確認

### 1. 基本確認

```bash
# DB内の動物数を確認
sqlite3 data/tail-match.db "SELECT COUNT(*) FROM tails;"

# 施設別の動物数を確認
sqlite3 data/tail-match.db "SELECT m.name, COUNT(t.id) FROM municipalities m LEFT JOIN tails t ON m.id = t.municipality_id GROUP BY m.id;"
```

### 2. 履歴確認

```bash
# 履歴ファイルを確認
cat .claude/shelters-history.yaml | grep -A 15 "chiba/chiba-city-cats"
```

**確認ポイント**:

- `verified: true` - 動作確認済みか
- `last_success` - 最終成功日時
- `last_error` - 最終エラー日時
- `mismatch_count` - HTML/YAML/DB不一致回数

### 3. エラー確認

```bash
# エラーがあった施設を抽出
grep -A 5 "❌.*失敗" logs/scraping/$(ls -t logs/scraping/ | head -1)

# 履歴ファイルからエラーを確認
cat .claude/shelters-history.yaml | grep -B 3 "status: error"
```

---

## ⚠️ トラブルシューティング

### パターン1: 特定施設のスクレイピング失敗

**原因**:

- サイト構造変更
- ネットワークエラー
- タイムアウト

**対応**:

```bash
# 該当施設を単独で実行してエラー詳細を確認
cd scripts/scrapers/{prefecture}/{municipality}
node scrape.js
node html-to-yaml.js
```

### パターン2: HTML→YAML で動物数が減少

**警告例**:

```
⚠️  [History Logger] HTML→YAMLで2匹減少 (20→18)
```

**原因**:

- HTMLパース処理のバグ
- セレクタの変更
- 譲渡済み判定の誤作動

**対応**:

1. HTMLファイルを確認:

```bash
ls -lt data/html/{prefecture}/{municipality}/ | head -1
cat data/html/{prefecture}/{municipality}/最新ファイル.html | less
```

2. html-to-yaml.jsのセレクタを確認・修正

### パターン3: YAML→DB で動物数が減少

**警告例**:

```
⚠️  [History Logger] YAML→DBで3匹減少 (18→15)
```

**原因**:

- YAMLファイルの形式エラー
- 必須フィールド不足（external_id等）
- DB投入時のバリデーションエラー

**対応**:

1. YAMLファイルを確認:

```bash
cat data/yaml/{prefecture}/{municipality}/最新ファイル.yaml
```

2. yaml-to-db.jsのログを確認:

```bash
node scripts/yaml-to-db.js 2>&1 | grep "ERROR\|WARNING"
```

### パターン4: 全施設で0匹

**原因**:

- DBファイルが削除されたまま
- yaml-to-db.js が実行されていない

**対応**:

```bash
# yaml-to-db.jsを手動実行
node scripts/yaml-to-db.js
```

---

## 🔧 メンテナンス作業

### 1. 新規施設追加時

新規施設を追加した場合、`scripts/run-all-scrapers.sh` の `SCRAPERS` 配列に追加：

```bash
vim scripts/run-all-scrapers.sh

# SCRAPERS配列に追加
SCRAPERS=(
  # ... 既存施設 ...
  "{prefecture}/{municipality}"  # 新規施設
)
```

### 2. 履歴データのクリーンアップ

履歴ファイルが大きくなりすぎた場合（通常は不要）：

```bash
# 古い履歴を削除（last_10_runs を last_5_runs に変更）
# ⚠️ 注意: 履歴ロガーのコード修正が必要
```

### 3. ログファイルのローテーション

```bash
# 30日以上前のログを削除
find logs/scraping -name "*.log" -mtime +30 -delete
```

---

## 📋 除外施設（手動実行が必要）

以下の2施設は画像OCRが必要なため、自動実行から除外されています：

### 1. 大阪府堺市（猫）

**理由**: PDF画像から情報を抽出する必要あり

**手動実行**:

```bash
bash scripts/scrapers/osaka/sakai-city-cats/run-full-scrape.sh

# 画像確認後、Claude Vision APIで情報抽出
# YAMLファイルを手動更新
# その後 yaml-to-db.js 実行
```

### 2. 神奈川県横浜市（猫）

**理由**: 画像から情報を抽出する必要あり

**手動実行**:

```bash
bash scripts/scrapers/kanagawa/yokohama-city-cats/run-full-scrape.sh

# 画像確認後、update-yaml-from-images.js で情報抽出
# その後 yaml-to-db.js 実行
```

---

## 📈 監視・アラート（将来実装）

### 1. エラー通知

cronジョブに失敗通知を追加：

```bash
# メール通知
0 3 * * * cd /home/user/tail-match && bash scripts/run-all-scrapers.sh || echo "スクレイピング失敗" | mail -s "[ERROR] Tail Match" admin@example.com
```

### 2. ダッシュボード

管理画面 `/admin/scraping` で以下を確認：

- 各施設の最終実行日時
- 成功率
- エラー発生施設
- 動物数の推移

---

## 🔐 セキュリティ

### 1. User-Agent

全スクレイパーで統一されたUser-Agentを使用：

```
TailMatchBot/1.0 (Tail Match Animal Rescue Service; +https://tail-match.llll-ll.com; contact@tail-match.llll-ll.com)
```

### 2. アクセス間隔

- 施設間: **5秒**
- ページ間: **3秒**
- リトライ間隔: **2秒**

### 3. robots.txt 遵守

すべての自治体サイトのrobots.txtを事前確認済み。

---

## 📞 エスカレーション

### レベル1: 軽微なエラー（1-2施設）

- **対応**: 次回実行で自動復旧を待つ
- **記録**: 履歴ファイルに自動記録

### レベル2: 複数施設エラー（3-5施設）

- **対応**: 各施設のスクレイパーを個別に手動実行
- **調査**: サイト構造変更の可能性を確認

### レベル3: 大規模障害（6施設以上）

- **対応**: システム全体の確認
  - ネットワーク接続
  - Playwright動作確認
  - ディスク容量
- **調査**: インフラ障害の可能性

---

## 📝 変更履歴

| 日付       | 変更内容                                 |
| ---------- | ---------------------------------------- |
| 2025-11-13 | 初版作成（26施設対応、堺市・横浜市除外） |
| -          | -                                        |

---

## 🚧 将来の改善予定

1. **堺市・横浜市の完全自動化**
   - Tesseract.js等のOCRライブラリ統合
   - または、自治体への問い合わせでテキスト化された情報を入手

2. **並列実行**
   - 現在は順次実行（5秒間隔）
   - 将来は並列実行で高速化（サーバー負荷に配慮）

3. **リトライ機構**
   - 失敗した施設を自動的に再実行
   - 最大3回までリトライ

4. **差分更新**
   - DB全削除ではなく、変更があった施設のみ更新
   - 履歴比較による効率化

---

**次のドキュメント**: なし（これが運用の最終手順書です）
