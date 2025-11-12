# Tail Match - スクレイピングスクリプト

このディレクトリには、全国の自治体保護猫情報を収集するスクレイピングスクリプトが含まれています。

---

## 📁 ディレクトリ構造

```
scripts/
├── scrapers/                    # 自治体ごとのスクレイパー
│   ├── ishikawa/               # 石川県
│   │   ├── aigo-ishikawa/      # いしかわ動物愛護センター
│   │   │   ├── scrape.js       # HTML収集（Playwright）
│   │   │   ├── html-to-yaml.js # YAML抽出
│   │   │   └── README.md       # 実行方法・実績
│   │   └── kanazawa-city/      # 金沢市動物愛護管理センター
│   │       ├── scrape.js
│   │       ├── html-to-yaml.js
│   │       └── README.md
│   └── toyama/                 # 富山県
│       └── toyama-pref/        # 富山県動物管理センター
│           ├── scrape.js
│           ├── html-to-yaml.js
│           └── README.md
├── lib/                        # 共通ライブラリ
│   ├── html-saver.js          # HTML保存ロジック
│   ├── db.js                  # SQLite接続
│   └── detect-javascript-site.js
└── yaml-to-db.js              # YAML→DB投入（汎用）
```

---

## 🚀 3ステップパイプライン

Tail Match のスクレイピングは**3ステップ**で構成されています：

### Step 1: HTML収集（Playwright）

```bash
node scripts/scrapers/{municipality}/scrape.js
```

- **目的**: 自治体サイトからJavaScript実行後のHTMLを取得
- **ツール**: Playwright（Chromium）
- **出力**: `data/html/{prefecture}/{municipality}/YYYYMMDD_HHMMSS_tail.html`
- **特徴**:
  - JavaScript動的レンダリング対応
  - プロキシ対応
  - リトライ機能（最大3回）
  - 礼儀正しいスクレイピング（3秒間隔）

### Step 2: YAML抽出（Cheerio + 正規表現）

```bash
node scripts/scrapers/{municipality}/html-to-yaml.js
```

- **目的**: HTMLから猫データを抽出してYAML形式で出力
- **ツール**: Cheerio（軽量HTMLパーサー）
- **出力**: `data/yaml/{prefecture}/{municipality}/YYYYMMDD_HHMMSS_tail.yaml`
- **特徴**:
  - 人間が確認・修正可能なYAML形式
  - クロスチェック機能（性別・年齢・画像の整合性検証）
  - 信頼度レベル判定（high/medium/low/critical）

### Step 3: DB投入（better-sqlite3）

```bash
# DRY-RUN（確認のみ）
node scripts/yaml-to-db.js --dry-run

# 本番投入
node scripts/yaml-to-db.js
```

- **目的**: 検証済みYAMLをSQLiteデータベースに投入
- **ツール**: better-sqlite3
- **対象DB**: `data/tail-match.db`
- **特徴**:
  - UPSERT（重複は更新）
  - トランザクション対応
  - 信頼度チェック（criticalは投入前確認）

---

## ⚠️ 重要な規則

### 1. ファイル構造

```
data/
├── html/
│   └── {prefecture}/              # ⚠️ 都道府県階層は必須
│       └── {municipality}/
│           ├── YYYYMMDD_HHMMSS_tail.html  # タイムスタンプ付き
│           └── latest_metadata.json       # 最新メタデータ
└── yaml/
    └── {prefecture}/
        └── {municipality}/
            └── YYYYMMDD_HHMMSS_tail.yaml
```

**NG例**:

- ❌ `data/html/kanazawa-city/` （都道府県階層がない）
- ❌ `data/html/ishikawa/kanazawa-city/archive/` （archiveは不要）

**OK例**:

- ✅ `data/html/ishikawa/aigo-ishikawa/20251111_194744_tail.html`
- ✅ `data/html/ishikawa/kanazawa-city/20251112_114924_tail.html`

### 2. municipality 設定

スクレイパーの `municipality` は**パス形式**で指定：

```javascript
const CONFIG = {
  municipality: 'ishikawa/aigo-ishikawa', // ✅ 正しい
  // municipality: 'aigo-ishikawa',        // ❌ 間違い
};
```

### 3. archiveディレクトリは不要

HTMLファイルと `latest_metadata.json` は**同じ階層**に配置：

```
data/html/ishikawa/aigo-ishikawa/
├── 20251111_194744_tail.html    # ✅ 直接配置
└── latest_metadata.json         # ✅ 直接配置
```

---

## 📝 新規自治体追加方法

詳細は `.claude/NEW_MUNICIPALITY_GUIDE.md` を参照してください。

**概要**:

1. 対象サイトを調査（HTMLサンプル取得、セレクタ確認）
2. `scripts/scrapers/{municipality}/` フォルダを作成
3. 既存スクレイパーをコピーして修正
4. テスト実行（HTML収集 → YAML抽出 → DB投入）
5. README作成

---

## 🔍 トラブルシューティング

### 猫が0匹抽出される

**原因**: セレクタが間違っている

**解決方法**:

```bash
# HTMLで実際の構造を確認
grep -n "期待するセレクタ" data/html/{prefecture}/{municipality}/*.html
```

セレクタを緩くする：

- ❌ `div.wysiwyg > table` （直接の子要素のみ）
- ✅ `div.wysiwyg table` （子孫要素すべて）

### 画像URLが空

**原因**: DOM構造の把握が不正確

**解決方法**:

```javascript
// 画像の位置を正確に特定
const $wysiwyg = $table.closest('div.wysiwyg');
const $figure = $wysiwyg.prev('figure.img-item'); // 直前のfigure
const imageUrl = $figure.find('img').attr('src');
```

### HTMLサイズが小さい（1KB以下）

**原因**: JavaScript動的レンダリングが必要

**解決方法**:

- `wait_for_js` を増やす（5000 → 10000）
- セレクタ待機を追加

---

## 🛠 共通ライブラリ（lib/）

### html-saver.js

HTML保存ロジック：

```javascript
import { saveHtml, saveMetadata } from './lib/html-saver.js';

const result = saveHtml(html, {
  municipality: 'ishikawa/aigo-ishikawa',
  count: hasAnyAnimals ? 1 : 0,
  animalType: 'tail',
});
```

- `count === 0`: `latest_empty.html` に上書き
- `count > 0`: `YYYYMMDD_HHMMSS_tail.html` として保存
- **archiveディレクトリは作成しない**

### db.js

SQLite接続：

```javascript
import { initializeDatabase, closeDatabase } from './lib/db.js';

const db = initializeDatabase();
// ... データベース操作
closeDatabase(db);
```

### detect-javascript-site.js

JavaScript必須サイトを検出（現在は使用していない、Playwrightを常時使用）

---

## 📊 実績データ

### 石川県

#### いしかわ動物愛護センター

- **URL**: https://aigo-ishikawa.jp/petadoption_list/
- **発見数**: 18匹
- **信頼度**: HIGH
- **JavaScript必須**: Yes

#### 金沢市動物愛護管理センター

- **URL**: https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/7301.html
- **発見数**: 2匹（みたらし、キング）
- **信頼度**: HIGH
- **JavaScript必須**: No（静的HTMLだがPlaywright使用）

---

## 🔐 礼儀正しいスクレイピング

- ✅ リクエスト間隔: 3秒以上
- ✅ User-Agent設定: `TailMatchBot/1.0 (Tail Match Animal Rescue Service; +https://tail-match.llll-ll.com)`
- ✅ robots.txt 遵守
- ✅ 深夜・早朝実行（サーバー負荷軽減）
- ✅ リトライ機能（最大3回、2秒間隔）
- ✅ タイムアウト: 30秒

---

## 📚 関連ドキュメント

- **[.claude/NEW_MUNICIPALITY_GUIDE.md]** - 新規自治体追加ガイド（必読）
- **[.claude/scraping-architecture.md]** - スクレイピングアーキテクチャ仕様
- **[.claude/CLAUDE.md]** - プロジェクト全体仕様

---

このREADMEは金沢市動物愛護管理センター追加時の失敗を踏まえて作成されました。
次回同じミスをしないよう、必ず熟読してください。
