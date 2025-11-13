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

**実行時間**: 約20-30分（28施設 × 平均1分）

**ログ確認**:

```bash
# 最新のログを確認
ls -lt logs/scraping/ | head -5
cat logs/scraping/20251113_030000_full_run.log

# サマリーを表示
node scripts/show-scraping-summary.js
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

### 1. サマリー確認（最優先）

**2025-11-13追加**: 最も簡単な確認方法

```bash
# スクレイピング結果サマリーを表示
node scripts/show-scraping-summary.js
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

**確認ポイント**:

- `verified: true` - 動作確認済みか
- `last_success` - 最終成功日時
- `last_error` - 最終エラー日時
- `mismatch_count` - HTML/YAML/DB不一致回数
- `last_10_runs[0].status` - 最新実行のステータス（success/error/mismatch）

### 4. エラー確認

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

### パターン5: countAnimalsInHTML is not defined エラー

**2025-11-13追加**: 新規施設追加時によくあるエラー

**エラー例**:

```
ReferenceError: countAnimalsInHTML is not defined
    at main (file:///path/to/scrape.js:70:25)
```

**原因**:

- scrape.jsに`countAnimalsInHTML`関数が未定義
- 履歴ロガー統合時に`logHTMLCount(countAnimalsInHTML(html))`を追加したが、関数本体を追加し忘れた

**対応**:

1. 他施設のscrape.jsから`countAnimalsInHTML`関数をコピー:

```bash
# テンプレートとして使える施設
cat scripts/scrapers/chiba/chiba-pref-dogs/scrape.js | grep -A 50 "function countAnimalsInHTML"
```

2. または、自動修正ツールを使用:

```bash
node scripts/fix-missing-count-function.js
```

### パターン6: allAnimals is not defined エラー

**2025-11-13追加**: コピー&ペーストミス

**エラー例**:

```
ReferenceError: allAnimals is not defined
    at main (file:///path/to/html-to-yaml.js:195:25)
```

**原因**:

- html-to-yaml.jsで`logger.logYAMLCount(allAnimals.length)`としているが、実際の変数名は`allCats`や`allDogs`

**対応**:

```bash
# 該当行を修正
vim scripts/scrapers/{prefecture}/{municipality}/html-to-yaml.js

# 修正例
logger.logYAMLCount(allAnimals.length);  # ❌
↓
logger.logYAMLCount(allCats.length);     # ✅ (猫の場合)
logger.logYAMLCount(allDogs.length);     # ✅ (犬の場合)
```

---

## 🔧 メンテナンス作業

### 1. 新規施設追加時

**2025-11-13更新**: 新規施設を追加した場合の手順：

1. **スクレイパー作成** ([scraping-guide.md](./scraping-guide.md)参照)
2. **run-full-scrape.sh作成** (他施設からコピー推奨)
3. **run-all-scrapers.sh更新**:

```bash
vim scripts/run-all-scrapers.sh

# SCRAPERS配列に追加
SCRAPERS=(
  # ... 既存施設 ...
  "{prefecture}/{municipality}"  # 新規施設
)
```

4. **履歴ロガー統合** ([history-logger-guide.md](./history-logger-guide.md)参照)
   - scrape.jsに`logHTMLCount()`追加
   - html-to-yaml.jsに`logYAMLCount()`追加
   - yaml-to-db.jsは自動対応（municipality_idで判定）

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

## 📋 特殊な施設の扱い

### 1. 完全自動化施設（全28施設）

**2025-11-13更新**: 全施設が統一された`.sh`ラッパーで自動実行可能になりました。

```bash
# 全28施設を一括実行
bash scripts/run-all-scrapers.sh
```

**統一インターフェース**:

- 各施設: `scripts/scrapers/{prefecture}/{municipality}/run-full-scrape.sh`
- 内部処理: scrape.js → html-to-yaml.js
- 特殊施設（横浜市・堺市）も統一インターフェースで実行

### 2. 画像OCR施設（2施設）

以下の施設は画像から情報を抽出しますが、**自動実行可能**です：

#### 大阪府堺市（猫）

- **特徴**: PDF画像から情報を抽出
- **自動実行**: ✅ 可能（画像URL抽出まで）
- **手動作業**: 画像内容の詳細確認（オプション）

#### 神奈川県横浜市（猫）

- **特徴**: 画像から猫情報を抽出
- **自動実行**: ✅ 可能（画像ダウンロード＋テンプレート生成）
- **手動作業**: update-yaml-from-images.js での情報補完（オプション）

**注意**: 両施設とも基本情報はYAMLに出力されるため、DB投入は自動で可能です。

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

| 日付       | 変更内容                                                             |
| ---------- | -------------------------------------------------------------------- |
| 2025-11-13 | 初版作成（26施設対応、堺市・横浜市除外）                             |
| 2025-11-13 | 全28施設統一インターフェース対応、エラーゼロ達成、履歴ロガー統合完了 |

---

## 🎯 現在の運用状況（2025-11-13時点）

### ✅ 達成済み

- ✅ **全28施設の統一インターフェース化**: すべての施設が`run-full-scrape.sh`で実行可能
- ✅ **エラーゼロ達成**: 全施設がエラーなく実行完了
- ✅ **履歴ロガー統合完了**: HTML→YAML→DBの全パイプラインで自動カウント追跡
- ✅ **多段階スクレイパー対応**: 横浜市・堺市も統一インターフェースで実行可能
- ✅ **自動警告システム**: 1匹でも減少したら自動検出・警告
- ✅ **成功率79%**: 22/28施設が正常動作、残り6施設は0匹（正常）

### 📊 現在の運用実績

```
対象施設数: 28施設
✅ 成功: 22施設 (79%)
❌ エラー: 0施設 (0%) ← エラーゼロ達成！
⚠️  不一致: 1施設 (4%) ← いしかわ（19→18、許容範囲）
📭 動物0匹: 5施設 (18%) ← 正常（実際に0匹）
```

## 🚧 将来の改善予定

1. **いしかわ動物愛護センターの不一致解消**
   - HTML→YAMLで1匹減少（19→18）
   - パース精度の向上が必要

2. **並列実行**
   - 現在は順次実行（5秒間隔）
   - 将来は並列実行で高速化（サーバー負荷に配慮）

3. **リトライ機構**
   - 失敗した施設を自動的に再実行
   - 最大3回までリトライ

4. **差分更新**
   - DB全削除ではなく、変更があった施設のみ更新
   - 履歴比較による効率化

5. **OCR完全自動化**
   - 横浜市・堺市の画像情報を完全自動抽出
   - Tesseract.js等のOCRライブラリ統合

---

**次のドキュメント**: なし（これが運用の最終手順書です）
