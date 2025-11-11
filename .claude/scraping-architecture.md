# Tail Match - スクレイピングアーキテクチャ仕様

**最終更新**: 2025-11-11
**ステータス**: 設計確定、実装開始

---

## 🎯 設計方針

### 参考プロジェクト

1. **osaka-kenpo** - Node.js + axios + cheerio
2. **kanazawa-dirt-one-spear** - HTML保存→後処理のパターン

### 技術スタック

- **言語**: Node.js (TypeScript/JavaScript)
- **HTTP**: axios + https-proxy-agent
- **HTML解析**: cheerio
- **データベース**: SQLite (`better-sqlite3`)
- **動的サイト**: Playwright (必要な場合のみ)

---

## 📁 ディレクトリ構造

```
tail-match/
├── data/
│   ├── tail-match.db              # SQLite データベース
│   └── html/                      # 収集したHTML（全保存）
│       ├── ishikawa/
│       │   ├── latest_empty.html  # 最新の空状態（上書き）
│       │   └── archive/           # 掲載ありHTML（全保存）
│       │       ├── 20251111_093045_5cats.html
│       │       └── 20251112_101520_3cats.html
│       ├── tokyo/
│       ├── osaka/
│       └── ...
├── scripts/
│   ├── lib/
│   │   ├── detect-javascript-site.js  # JS必須サイト自動検出
│   │   ├── scraper-base.js            # 共通スクレイピングロジック
│   │   └── db.js                      # SQLite接続
│   ├── scrape-ishikawa.js         # 石川県スクレイパー
│   ├── scrape-tokyo.js            # 東京都スクレイパー
│   ├── scrape-all.js              # 全自治体実行
│   ├── parse-ishikawa.js          # HTML→SQLite（石川県）
│   └── parse-all.js               # 全HTMLパース
└── database/
    └── schema.sql                 # SQLite スキーマ定義
```

---

## 🔄 2ステップ処理フロー

### **Step 1: HTML収集**（毎日実行）

```javascript
// scripts/scrape-ishikawa.js
// 目的: HTMLを収集して保存するだけ
// 🚫 DB保存はしない
// ✅ 空のページも保存する（重要！）

1. 自治体サイトからHTMLを取得
2. JavaScript必須サイトかを自動検出
3. 掲載数をカウント
4. ファイル名を決定:
   - 掲載なし → latest_empty.html（上書き）
   - 掲載あり → archive/YYYYMMDD_HHMMSS_Ncats.html（新規保存）
5. HTML保存
```

**重要な考え方**:

- 猫は常に掲載されているとは限らない
- 空のページも貴重な情報（「今日は掲載なし」という記録）
- 掲載ありのHTMLは絶対に上書きしない（後で何度でもパース可能）

### **Step 2: HTMLパース→SQLite**（週1回実行）

```javascript
// scripts/parse-all.js
// 目的: 保存済みHTMLを全て読み込んでSQLiteに保存

1. data/html/**/*.html を再帰的に走査
2. cheerio でパース
3. データ抽出
4. SQLiteに保存（UPSERT）
```

---

## 🚨 JavaScript必須サイトの自動検出

### 検出ロジック（5つのシグナル）

```javascript
export function detectJavaScriptSite(html, config) {
  const signals = {
    // 1. 空のルート要素
    emptyRoot: /<div id="(app|root|__next)">\s*<\/div>/.test(html),

    // 2. HTMLサイズが異常に小さい（5KB未満）
    tooSmall: html.length < 5000,

    // 3. SPAフレームワークの痕跡
    spaFramework: /react|vue|angular|__NEXT_DATA__/.test(html),

    // 4. 期待される要素が見つからない
    missingContent: $(config.expected_selectors).length === 0,

    // 5. script bundleのみで実コンテンツなし
    onlyScripts:
      /<script.*src=.*?(main|bundle)\.js/.test(html) && !/<table|<article|<ul/.test(html),
  };

  // 2つ以上該当でJS必須判定
  const score = Object.values(signals).filter(Boolean).length;
  return { isJavaScriptRequired: score >= 2, signals, score };
}
```

### 検出時の処理

```javascript
if (detection.isJavaScriptRequired) {
  console.log('⚠️  警告: JavaScript動的レンダリングサイトです');

  // 静的HTMLを警告付きで保存
  fs.writeFileSync('static_EMPTY_WARNING.html', html);
  fs.writeFileSync('detection_result.json', JSON.stringify(detection));

  // エラー終了（CI/CDで気付けるように）
  process.exit(1);
}
```

---

## 📦 ファイル命名規則

### 規則

```
latest_empty.html                     # 掲載なし（最新のみ、上書きOK）
archive/20251111_093045_5cats.html    # 掲載あり（全保存、上書きNG）
archive/20251112_101520_0cats.html    # 0匹でもarchive（デバッグ用）
static_EMPTY_WARNING.html             # JS必須サイト警告
detection_result.json                 # 検出結果メタデータ
```

### タイムスタンプ形式

```javascript
const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
// 結果: 20251111_093045
```

---

## 🗄️ SQLite スキーマ

```sql
-- regions (地域)
CREATE TABLE regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'prefecture',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- municipalities (自治体)
CREATE TABLE municipalities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id INTEGER REFERENCES regions(id),
    name TEXT NOT NULL,
    website_url TEXT,
    contact_info TEXT,  -- JSON
    scraping_config TEXT,  -- JSON
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- tails (保護動物)
CREATE TABLE tails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipality_id INTEGER REFERENCES municipalities(id),
    external_id TEXT,
    animal_type TEXT DEFAULT 'cat',
    name TEXT,
    breed TEXT,
    age_estimate TEXT,
    gender TEXT,
    color TEXT,
    size TEXT,
    health_status TEXT,
    personality TEXT,
    special_needs TEXT,
    images TEXT,  -- JSON array
    protection_date TEXT,
    deadline_date TEXT,
    status TEXT DEFAULT 'available',
    transfer_decided INTEGER DEFAULT 0,
    source_url TEXT,
    last_scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(municipality_id, external_id)
);

-- scraping_logs (スクレイピング履歴)
CREATE TABLE scraping_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipality_id INTEGER REFERENCES municipalities(id),
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    status TEXT,
    tails_found INTEGER DEFAULT 0,
    tails_added INTEGER DEFAULT 0,
    tails_updated INTEGER DEFAULT 0,
    error_message TEXT,
    html_filepath TEXT
);
```

---

## 🔧 実装例

### 基本スクレイパー

```javascript
// scripts/scrape-ishikawa.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { detectJavaScriptSite } from './lib/detect-javascript-site.js';

const CONFIG = {
  url: 'https://aigo-ishikawa.jp/petadoption_list/',
  expected_selectors: '.data_boxes, .data_box, .cat-card, table.animal-list',
  retry_count: 3,
  retry_delay: 2000,
  request_delay: 3000, // 礼儀正しく3秒間隔
  timeout: 30000,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

// プロキシ設定
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

// ディレクトリ作成
const htmlDir = 'data/html/ishikawa';
const archiveDir = path.join(htmlDir, 'archive');
fs.mkdirSync(archiveDir, { recursive: true });

console.log('📥 いしかわ動物愛護センター - HTML収集開始');

// HTML取得
const response = await axios.get(CONFIG.url, {
  httpsAgent: agent,
  headers: { 'User-Agent': CONFIG.user_agent },
  timeout: CONFIG.timeout,
});

// JavaScript必須サイトか検出
const detection = detectJavaScriptSite(response.data, CONFIG);

if (detection.isJavaScriptRequired) {
  console.error('⚠️  JavaScript動的レンダリングサイトです');
  fs.writeFileSync(path.join(htmlDir, 'static_EMPTY_WARNING.html'), response.data);
  process.exit(1);
}

// 掲載数カウント
const $ = cheerio.load(response.data);
const catCount = $(CONFIG.expected_selectors).length;

// ファイル名決定
const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');

let filepath;
if (catCount === 0) {
  filepath = path.join(htmlDir, 'latest_empty.html');
  console.log('📭 掲載なし - latest_empty.html を上書き');
} else {
  filepath = path.join(archiveDir, `${timestamp}_${catCount}cats.html`);
  console.log(`🐱 ${catCount}匹発見 - archive に保存`);
}

// HTML保存
fs.writeFileSync(filepath, response.data, 'utf-8');
console.log(`✅ 保存完了: ${filepath}`);
console.log(`📊 サイズ: ${response.data.length} bytes`);
```

---

## 🚀 実行フロー

### 開発時

```bash
# 個別自治体テスト
node scripts/scrape-ishikawa.js

# HTMLパース（開発中は何度でも）
node scripts/parse-ishikawa.js
```

### 本番運用（cron）

```bash
# 毎日 AM 3:00 - HTML収集
0 3 * * * cd /path/to/tail-match && node scripts/scrape-all.js

# 毎週日曜 AM 4:00 - 全HTMLパース
0 4 * * 0 cd /path/to/tail-match && node scripts/parse-all.js
```

---

## ✅ 設計の利点

1. **デバッグ容易** - HTMLが残っているので何度でもパースし直せる
2. **軽量** - SQLiteで十分、PostgreSQL不要
3. **貴重なデータ保護** - 掲載ありHTMLは絶対に上書きしない
4. **自動検出** - JavaScript必須サイトを自動で警告
5. **実績あり** - osaka-kenpo + kanazawa のベストプラクティス統合

---

## 🔐 礼儀正しいスクレイピング

- ✅ リクエスト間隔: 3秒以上
- ✅ User-Agent設定: 明確な識別子
- ✅ robots.txt 遵守
- ✅ 深夜・早朝実行（サーバー負荷軽減）
- ✅ リトライ機能（最大3回、2秒間隔）
- ✅ タイムアウト: 30秒

---

**このアーキテクチャに基づいて、各自治体のスクレイパーを順次実装していきます。**
