# Core Scripts - 本番運用スクリプト

このディレクトリには、Tail Matchの本番運用で使用する**重要なスクリプト**が格納されています。

## ⚠️ 重要

- **削除禁止**: このディレクトリ内のファイルは絶対に削除しないでください
- **慎重な変更**: 変更する場合は十分なテストを実施してください
- **gitコミット対象**: すべてのファイルはバージョン管理されます

## 📂 ファイル一覧

### `run-all-scrapers.sh`

**用途**: 全28施設の自動スクレイピング実行

**実行方法**:

```bash
bash scripts/core/run-all-scrapers.sh
```

**処理内容**:

1. DB全削除
2. 全施設スクレイピング（HTML収集→YAML抽出）
3. YAML→DB投入
4. 履歴記録（shelters-history.yaml更新）

**実行頻度**: 毎日1回（cron推奨: 早朝3:00）

---

### `yaml-to-db.js`

**用途**: YAMLファイルをSQLiteデータベースに投入

**実行方法**:

```bash
node scripts/core/yaml-to-db.js
```

**処理内容**:

- data/yaml/**/**.yaml を読み込み
- data/tail-match.db に投入
- shelters-history.yaml の DB count を更新

**依存関係**: 各施設のYAMLファイルが必要

---

### `show-scraping-summary.js`

**用途**: スクレイピング結果のサマリー表示

**実行方法**:

```bash
node scripts/core/show-scraping-summary.js
```

**出力例**:

```
📊 スクレイピング実行結果サマリー
対象施設数: 28施設
✅ 成功: 22施設 (79%)
❌ エラー: 0施設 (0%)
⚠️  不一致: 1施設 (4%)
📭 動物0匹: 5施設 (18%)
```

**参照ファイル**: `.claude/shelters-history.yaml`

---

### `cleanup-html-yaml.js`

**用途**: HTML/YAMLファイルの整理

**実行方法**:

```bash
# ドライラン（削除なし）
node scripts/core/cleanup-html-yaml.js --dry-run

# 実際に削除
node scripts/core/cleanup-html-yaml.js
```

**処理内容**:

- 各施設で最も匹数が多いYAMLを1つ保持
- 各施設で最新のHTMLを1つ保持
- それ以外のファイルを削除

**実行頻度**: 週1回程度（リポジトリサイズ削減）

---

## 🔄 運用フロー

```
毎日1回（早朝3:00）
  ↓
run-all-scrapers.sh 実行
  ↓
① DB全削除
② 全施設スクレイピング
③ YAML→DB投入
④ 履歴記録
  ↓
show-scraping-summary.js で結果確認
  ↓
完了
```

## 🛠️ トラブルシューティング

### エラーが発生した場合

```bash
# サマリーでエラー施設を確認
node scripts/core/show-scraping-summary.js

# 履歴詳細を確認
cat .claude/shelters-history.yaml | grep -A 20 "エラー施設名"

# 該当施設を個別実行
cd scripts/scrapers/{prefecture}/{municipality}
bash run-full-scrape.sh
```

### リポジトリサイズが大きい場合

```bash
# HTML/YAMLファイルを整理
node scripts/core/cleanup-html-yaml.js --dry-run  # 確認
node scripts/core/cleanup-html-yaml.js            # 実行
```

---

## 📝 関連ドキュメント

- **運用ガイド**: `.claude/operations-guide.md`
- **履歴ロガー**: `.claude/history-logger-guide.md`
- **スクレイピング設計**: `.claude/scraping-guide.md`
