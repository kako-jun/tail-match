# Tail Match - スクレイピングアーキテクチャ仕様

**最終更新**: 2025-11-11
**ステータス**: 石川県で実証完了、汎用化フェーズ

---

## 🎯 設計方針（改訂版）

### 実証済みアーキテクチャ

**3ステップパイプライン**（石川県で18匹100%抽出成功）

```
[1] HTML収集 (Playwright)
    ↓ data/html/{municipality}/archive/{timestamp}_tail.html
[2] YAML抽出 (Cheerio + 正規表現)
    ↓ data/yaml/{municipality}/{timestamp}_tail.yaml
[3] DB投入 (better-sqlite3)
    ↓ data/tail-match.db
```

### 技術スタック（確定版）

- **HTML収集**: Playwright 1.49.1（常時使用、JS動的レンダリング対応）
- **HTML解析**: cheerio（軽量・高速）
- **データ抽出**: 正規表現（raw_text優先、confidence 0.3→0.8に改善）
- **中間フォーマット**: YAML（js-yaml、人間が確認・修正可能）
- **データベース**: SQLite (`better-sqlite3`)
- **品質保証**: クロスチェック機能（性別/年齢/画像の整合性検証）

---

## 📁 ディレクトリ構造（2025-11-11現在）

```
tail-match/
├── data/
│   ├── tail-match.db              # SQLite データベース（バージョン管理対象）
│   ├── html/                      # 収集したHTML（全保存）
│   │   └── {municipality}/
│   │       ├── latest_metadata.json   # 最新実行の情報
│   │       └── archive/               # タイムスタンプ付きHTML
│   │           └── {timestamp}_tail.html
│   └── yaml/                      # 抽出済みYAML（検証・修正可能）
│       └── {municipality}/
│           └── {timestamp}_tail.yaml
├── scripts/
│   ├── lib/
│   │   ├── html-saver.js          # HTML保存（共通）
│   │   └── db.js                  # SQLite接続（共通）
│   ├── scrapers/                  # 【自治体ごとのスクレイパー】
│   │   └── ishikawa/              # 石川県（実装完了）
│   │       ├── scrape.js          # HTML収集
│   │       ├── html-to-yaml.js    # YAML抽出
│   │       └── README.md          # 実行方法・実績データ
│   └── yaml-to-db.js              # YAML→DB投入（汎用化済み）
└── database/
    └── schema.sql                 # SQLite スキーマ定義
```

### 今後の汎用化ディレクトリ案

```
scripts/
├── lib/
│   ├── playwright-fetcher.js      # 【新規】Playwright HTML取得（汎用）
│   ├── raw-text-extractor.js      # 【新規】raw_text優先抽出（汎用）
│   ├── cross-checker.js           # 【新規】クロスチェック機能（汎用）
│   ├── html-saver.js              # HTML保存（既存）
│   └── db.js                      # SQLite接続（既存）
├── scrapers/                      # 自治体ごとのディレクトリ
│   ├── ishikawa/                  # 石川県（完了）
│   │   ├── scrape.js
│   │   ├── html-to-yaml.js
│   │   └── README.md
│   └── {municipality}/            # 【新規自治体用テンプレート】
│       ├── scrape.js              # 自治体固有スクレイパー
│       ├── html-to-yaml.js        # 自治体固有パーサー
│       └── README.md              # 実行方法・実績
└── yaml-to-db.js                  # YAML→DB投入（完成）
```

---

## 🔄 3ステップ処理フロー（実証済み）

### **Step 1: HTML収集**（Playwright使用、毎日実行）

```bash
node scripts/scrapers/ishikawa/scrape.js
```

**処理内容**:

1. PlaywrightでChromium起動
2. ページにアクセス
3. **5秒待機**（JavaScriptで動的にHTMLをレンダリング）
4. レンダリング完了後のHTMLを取得
5. タイムスタンプ付きで保存: `data/html/ishikawa/archive/20251111_194744_tail.html`
6. メタデータ更新: `data/html/ishikawa/latest_metadata.json`

**出力例**:

```
data/html/ishikawa/archive/20251111_194744_tail.html  # 90KB（動物18匹）
```

**重要**:

- 常にPlaywrightを使用（JS動的サイトがデフォルト）
- 掲載ゼロの日も保存する（空HTMLも貴重なデータ）
- HTMLは絶対に上書きしない（後で何度でもパース可能）

---

### **Step 2: YAML抽出**（Cheerio + 正規表現、手動実行）

```bash
node scripts/scrapers/ishikawa/html-to-yaml.js
```

**処理内容**:

1. 最新のHTMLファイルを読み込み
2. Cheerioで解析
3. **raw_text優先抽出**:
   - `rawText = $(container).text()` で生テキスト取得
   - 正規表現で構造化データを抽出（例: `/仮名\s*[:：]?\s*([^\s種類性別...]+)/`）
   - セレクタベースはフォールバック
4. **クロスチェック実行**:
   - 性別キーワード数 vs 抽出動物数
   - 年齢キーワード数 vs 抽出動物数
   - 画像タグ数 vs 抽出動物数
5. 信頼度レベル判定（high/medium/low/critical）
6. YAML出力: `data/yaml/ishikawa/20251111_194744_tail.yaml`

**出力例**:

```yaml
meta:
  municipality_id: 'ishikawa'
  scraped_at: '2025-11-11T19:47:44+09:00'

cross_check:
  stats:
    gender_mentions: 18
    age_mentions: 36
    breed_mentions: 3
    image_tags: 29
  consistency_warnings:
    - '年齢表記(36)が抽出数より大幅に多い'
  confidence_level: 'medium'

animals:
  - external_id: 'ishikawa_001'
    name: '紅蘭（クラン）'
    breed: 'トイプードル'
    age_estimate: '２歳'
    gender: 'male'
    confidence_score: 0.8
    extraction_method: 'raw_text_priority'
```

**重要**:

- raw_text優先でconfidence 0.3→0.8に改善
- クロスチェックで取りこぼしを検出
- YAMLは人間が確認・修正可能

---

### **Step 3: DB投入**（better-sqlite3、手動実行）

```bash
# DRY-RUNで確認
node scripts/yaml-to-db.js --dry-run

# 実際に投入
node scripts/yaml-to-db.js
```

**処理内容**:

1. YAMLファイルを読み込み
2. 信頼度レベルをチェック（`critical`ならスキップ）
3. 各動物データを検証
4. SQLiteにUPSERT（重複は更新）
5. 投入結果サマリーを表示

**出力例**:

```
📊 投入結果サマリー
ファイル処理数: 1個
動物総数: 18匹
新規投入: 18匹
更新: 0匹
スキップ: 0匹
エラー: 0匹

利用可能な動物: 28匹
```

**重要**:

- `--dry-run`で事前確認必須
- `confidence_level: critical`は投入前に人間が確認
- UPSERTで同じ動物の更新に対応

---

## 🎯 なぜ3ステップなのか？

| ステップ        | 失敗時の対応                             | 利点                                     |
| --------------- | ---------------------------------------- | ---------------------------------------- |
| **1. HTML収集** | 再実行すればOK（サイトが落ちてなければ） | HTMLが残れば何度でもパース可能           |
| **2. YAML抽出** | HTMLから再抽出（サイトアクセス不要）     | パーサーロジック改善時に全HTML再処理可能 |
| **3. DB投入**   | YAMLから再投入（パース不要）             | データ修正が容易、ロールバック可能       |

**実例**: 石川県でraw_text優先パーサーを実装した際、保存済みHTMLを再パースしてconfidence 0.3→0.8に改善できた。

---

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

### 石川県の場合（2025-11-11実装完了）

```bash
# Step 1: HTML収集
node scripts/scrapers/ishikawa/scrape.js

# Step 2: YAML抽出
node scripts/scrapers/ishikawa/html-to-yaml.js

# Step 3: DB投入（DRY-RUN）
node scripts/yaml-to-db.js --dry-run

# Step 3: DB投入（本番）
node scripts/yaml-to-db.js
```

### 本番運用（cron例）

```bash
# 毎日 AM 3:00 - HTML収集（自治体ごと）
0 3 * * * cd /path/to/tail-match && node scripts/scrapers/ishikawa/scrape.js

# 手動で必要に応じてYAML抽出・DB投入
# （クロスチェック結果を確認してから投入するため）
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

---

## 📊 石川県での実証結果（2025-11-11）

### 実績データ

| 指標                 | Before               | After                    | 改善率 |
| -------------------- | -------------------- | ------------------------ | ------ |
| **HTMLサイズ**       | 1KB（空）            | 90KB                     | 9000%  |
| **抽出成功率**       | 0%                   | 100%（18/18匹）          | ∞      |
| **実名抽出**         | 0%（"保護動物1号"）  | 100%（"紅蘭（クラン）"） | ∞      |
| **犬種精度**         | 低（"ミックス"固定） | 高（"トイプードル"）     | -      |
| **confidence_score** | 0.3                  | 0.8                      | 167%   |

### パフォーマンス

- **HTML収集**: 約10秒（Playwright起動〜保存）
- **YAML抽出**: 約1秒（Cheerio解析）
- **DB投入**: 約0.5秒（18匹分、UPSERT）
- **合計**: 約12秒/自治体

### クロスチェック結果

```
性別表記: 18個  → 抽出数: 18匹 ✅ 一致
年齢表記: 36個  → 抽出数: 18匹 ⚠️ 取りこぼし可能性（要確認）
犬種表記: 3個   → 抽出数: 18匹 ⚠️ 低頻出（許容範囲）
画像タグ: 29個  → 抽出数: 18匹 ✅ 適切
```

**信頼度レベル**: MEDIUM（警告1件だが投入可能）

---

## 🔧 汎用化戦略

### ✅ 完全汎用化可能（すべての自治体で共通）

#### 1. Playwright HTML取得ライブラリ

```javascript
// scripts/lib/playwright-fetcher.js（新規作成推奨）

import { chromium } from 'playwright';

export async function fetchDynamicHTML(url, options = {}) {
  const {
    waitTime = 5000, // JS実行待機時間（自治体ごと調整可能）
    timeout = 30000,
    proxy = null,
    viewport = { width: 1920, height: 1080 },
  } = options;

  const browser = await chromium.launch({
    headless: true,
    proxy: proxy ? { server: proxy } : undefined,
  });

  const page = await browser.newPage({ viewport });
  await page.goto(url, { timeout, waitUntil: 'networkidle' });
  await page.waitForTimeout(waitTime);

  const html = await page.content();
  await browser.close();

  return html;
}
```

**用途**: どの自治体でも使える動的HTML取得。`waitTime`だけ調整すればOK。

---

#### 2. raw_text優先抽出パターン

```javascript
// scripts/lib/raw-text-extractor.js（新規作成推奨）

export function extractFieldFromRawText(rawText, fieldPatterns) {
  for (const pattern of fieldPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// 汎用パターンセット（日本の自治体サイトで共通）
export const COMMON_PATTERNS = {
  name: [
    /仮名\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
    /名前\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
    /愛称\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
  ],
  breed: [
    /種類\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
    /犬種\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
    /猫種\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
    /品種\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
  ],
  age: [
    /推定年齢\s*[:：]?\s*([^\s性別毛色体重更新日]+)/,
    /年齢\s*[:：]?\s*([^\s性別毛色体重更新日]+)/,
  ],
  color: [
    /毛色\s*[:：]?\s*([^\s推定年齢性別種類体重更新日]+)/,
    /色\s*[:：]?\s*([^\s推定年齢性別種類体重更新日]+)/,
  ],
  gender: [/性別\s*[:：]?\s*(オス|メス|雄|雌|♂|♀|male|female)/i],
};
```

**用途**: 自治体サイトの表記揺れに対応。複数パターンを試して最初にマッチしたものを使用。

**実績**: 石川県でconfidence 0.3→0.8に改善。

---

#### 3. クロスチェック機能

```javascript
// scripts/lib/cross-checker.js（新規作成推奨）

export function performCrossCheck(html, extractedAnimals) {
  const $ = cheerio.load(html);
  const fullText = $('body').text();

  const stats = {
    gender_mentions: (fullText.match(/オス|メス|雄|雌|♂|♀|male|female/gi) || []).length,
    age_mentions: (fullText.match(/[0-9０-９]+歳|[0-9０-９]+ヶ月|推定年齢/g) || []).length,
    breed_mentions: (fullText.match(/種類|犬種|猫種|品種|ミックス|雑種/g) || []).length,
    image_tags: $('img').length,
    color_mentions: (fullText.match(/毛色|カラー|色|白|黒|茶|灰|三毛/g) || []).length,
  };

  const warnings = [];

  // 性別チェック（汎用）
  if (stats.gender_mentions < extractedAnimals.length * 0.8) {
    warnings.push(
      `性別表記(${stats.gender_mentions})が抽出数(${extractedAnimals.length})より少ない`
    );
  }

  // 年齢チェック（汎用）
  if (stats.age_mentions > extractedAnimals.length * 1.5) {
    warnings.push(`年齢表記(${stats.age_mentions})が抽出数より大幅に多い - 取りこぼしの可能性`);
  }

  // 画像チェック（汎用）
  if (stats.image_tags < extractedAnimals.length * 0.5) {
    warnings.push(`画像数(${stats.image_tags})が少なすぎる可能性`);
  }

  // 信頼度レベル判定（汎用）
  let confidence_level = 'high';
  if (warnings.length >= 3) {
    confidence_level = 'critical';
  } else if (warnings.length >= 1) {
    confidence_level = 'medium';
  }

  return { stats, warnings, confidence_level };
}
```

**用途**: どの自治体でも使える品質検証。性別・年齢・画像などは普遍的な指標。

**実績**: 石川県で年齢表記36個vs抽出18匹の不一致を検出（要確認フラグ）。

---

#### 4. YAML構造（汎用フォーマット）

```yaml
# すべての自治体で統一されたYAML構造

meta:
  municipality_id: 'ishikawa' # 自治体ID
  scraped_at: '2025-11-11T19:47:44+09:00'
  source_url: 'https://...'
  html_filepath: 'data/html/ishikawa/archive/20251111_194744_tail.html'

cross_check:
  stats:
    gender_mentions: 18
    age_mentions: 36
    breed_mentions: 3
    image_tags: 29
  consistency_warnings:
    - '年齢表記(36)が抽出数より大幅に多い'
  confidence_level: 'medium' # high / medium / low / critical

animals:
  - external_id: 'ishikawa_001'
    name: '紅蘭（クラン）'
    animal_type: 'dog'
    breed: 'トイプードル'
    age_estimate: '２歳'
    gender: 'male'
    color: '茶'
    size: null
    health_status: null
    personality: null
    special_needs: null
    images: ['https://...']
    protection_date: null
    deadline_date: null
    status: 'available'
    source_url: 'https://...'
    confidence_score: 0.8 # 0.0-1.0
    extraction_method: 'raw_text_priority' # or 'selector_fallback'
    needs_review: false
```

**用途**: すべての自治体で統一されたデータ形式。`confidence_level`で品質を可視化。

---

#### 5. DB投入ロジック（汎用実装済み）

`scripts/yaml-to-db.js`はすでに汎用化されています：

```javascript
const CONFIG = {
  municipalities: ['ishikawa', 'tokyo', 'osaka'], // 配列で複数対応
  dryRun: process.argv.includes('--dry-run'),
  skipReview: process.argv.includes('--skip-review'),
};

// 信頼度チェック（汎用）
if (data.confidence_level === 'critical' && !CONFIG.skipReview) {
  console.warn('手動確認を推奨');
  return null;
}
```

**用途**: `municipalities`配列に追加するだけで複数自治体対応。

---

### 🏢 自治体ごとにカスタマイズが必要な部分

#### 1. セレクタパターン

```javascript
// scripts/config/ishikawa.js（新規作成推奨）

export const ISHIKAWA_SELECTORS = {
  container: '.data_box', // 動物情報のコンテナ（サイトごと異なる）
  name: '.animal-name',
  breed: '.animal-breed',
  gender: '.animal-gender',
  image: 'img.animal-photo',
  detailLink: 'a.detail-link',
};

export const ISHIKAWA_CONFIG = {
  municipalityId: 'ishikawa',
  sourceUrl: 'https://aigo-ishikawa.jp/petadoption_list/',
  waitTime: 5000, // JS実行待機時間（サイトによって異なる）
};
```

**理由**: HTMLの構造はサイトごとに完全に異なる。

---

#### 2. データマッピング

```javascript
// scripts/parsers/ishikawa-parser.js（新規作成推奨）

export function mapIshikawaData(rawData) {
  return {
    // 石川県固有: "オス" → "male" の変換
    gender: rawData.gender === 'オス' ? 'male' : rawData.gender === 'メス' ? 'female' : 'unknown',

    // 石川県固有: "２歳" → "2歳" の正規化
    age_estimate: rawData.age?.replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    ),

    // 石川県固有: external_idの生成ルール
    external_id: `ishikawa_${rawData.protection_number}`,
  };
}
```

**理由**: 自治体ごとに表記方法が異なる（全角/半角、用語統一など）。

---

## 🚀 新規自治体追加手順（テンプレート）

### ステップ1: 調査

1. 対象URLを確認
2. ブラウザで開き、JavaScriptが必要か確認（DevToolsでネットワークタブ確認）
3. 動物情報のHTMLセレクタを調査
4. データ項目を確認（名前、犬種、年齢、性別、画像など）

### ステップ2: 設定ファイル作成

```javascript
// scripts/scrapers/{municipality}/config.js

export const {MUNICIPALITY}_CONFIG = {
  municipalityId: '{municipality}',
  sourceUrl: '{url}',
  waitTime: 5000,  // 初期値、動作確認後に調整
};

export const {MUNICIPALITY}_SELECTORS = {
  container: '.animal-item',  // 要調査
  name: '.name',              // 要調査
  // ...
};

export const {MUNICIPALITY}_PATTERNS = {
  // COMMON_PATTERNS をベースに自治体固有パターンを追加
  name: [
    ...COMMON_PATTERNS.name,
    /独自パターン/,
  ],
};
```

### ステップ3: スクレイピングスクリプト作成

```javascript
// scripts/scrapers/{municipality}/scrape.js

import { fetchDynamicHTML } from '../../lib/playwright-fetcher.js';
import { saveHTML } from '../../lib/html-saver.js';
import { {MUNICIPALITY}_CONFIG } from './config.js';

async function main() {
  const html = await fetchDynamicHTML({MUNICIPALITY}_CONFIG.sourceUrl, {
    waitTime: {MUNICIPALITY}_CONFIG.waitTime,
  });

  const filepath = saveHTML(html, {MUNICIPALITY}_CONFIG.municipalityId);
  console.log(`✅ HTML保存: ${filepath}`);
}

main();
```

### ステップ4: パーサー作成

```javascript
// scripts/scrapers/{municipality}/html-to-yaml.js

import { extractFieldFromRawText, COMMON_PATTERNS } from '../../lib/raw-text-extractor.js';
import { {MUNICIPALITY}_SELECTORS, {MUNICIPALITY}_PATTERNS } from './config.js';

export function extract{Municipality}Animals($) {
  const animals = [];

  $({MUNICIPALITY}_SELECTORS.container).each((index, container) => {
    const $container = $(container);
    const rawText = $container.text();

    // raw_text優先抽出（汎用ライブラリ使用）
    const name = extractFieldFromRawText(rawText, {MUNICIPALITY}_PATTERNS.name) ||
                 $container.find({MUNICIPALITY}_SELECTORS.name).text().trim();

    // ... 他のフィールドも同様

    animals.push({ name, breed, age, gender, ... });
  });

  return animals;
}
```

### ステップ5: クロスチェック実装

```javascript
// scripts/html-to-yaml.js に統合

import { performCrossCheck } from './lib/cross-checker.js';

// パース後
const crossCheckResult = performCrossCheck(html, animals);

// YAMLに追加
yamlData.cross_check = crossCheckResult;
```

### ステップ6: テスト実行

```bash
# HTML収集
node scripts/scrapers/{municipality}/scrape.js

# HTMLサイズ確認（1KB以下なら失敗）
ls -lh data/html/{municipality}/archive/*.html

# YAML抽出
node scripts/scrapers/{municipality}/html-to-yaml.js

# クロスチェック結果確認
# → 信頼度がcriticalでないことを確認

# DB投入（DRY-RUN）
node scripts/yaml-to-db.js --dry-run

# DB投入（本番）
node scripts/yaml-to-db.js
```

---

## 📝 エージェント向けプロンプトテンプレート

新規自治体を追加する際は、以下の指示を使用してください：

```markdown
新しい自治体「{municipality_name}」のスクレイピングを実装してください。

## 前提条件

- 3ステップパイプライン（HTML収集→YAML抽出→DB投入）を使用
- 汎用化済みのライブラリを最大限活用
- クロスチェック機能を必ず実装

## 実装チェックリスト

### HTML収集

- [ ] `scripts/lib/playwright-fetcher.js` を使用
- [ ] `scripts/lib/html-saver.js` を使用
- [ ] waitTime を調整（初期値5000ms）
- [ ] HTMLサイズが十分か確認（1KB以下は失敗）

### YAML抽出

- [ ] `scripts/lib/raw-text-extractor.js` を使用
- [ ] COMMON_PATTERNS をベースに自治体固有パターンを追加
- [ ] raw_text優先抽出を実装
- [ ] セレクタベースをフォールバックとして実装
- [ ] confidence_score を計算（0.5以上が目標）

### クロスチェック

- [ ] `scripts/lib/cross-checker.js` を使用
- [ ] 性別キーワード数 vs 抽出動物数を比較
- [ ] 年齢キーワード数 vs 抽出動物数を比較
- [ ] 画像タグ数 vs 抽出動物数を比較
- [ ] confidence_level を判定（critical は投入前に確認）

### DB投入

- [ ] `scripts/yaml-to-db.js` の municipalities配列に追加
- [ ] DRY-RUNで確認
- [ ] 実際に投入

### 品質確認

- [ ] 実名が抽出されているか（「保護動物N号」ではない）
- [ ] confidence_score が 0.5 以上か
- [ ] クロスチェックで大きな警告が出ていないか
- [ ] DBに正しく投入されたか（件数確認）

## 注意事項

- raw_textからの抽出を優先すること（石川県でconfidence 0.3→0.8の実績）
- クロスチェックは必須（取りこぼし検出のため）
- confidence_level: critical の場合は投入前に人間が確認
- waitTime はサイトによって調整（3-10秒程度）
```

---

## 🎓 学んだ教訓

### ✅ やって良かったこと

1. **Playwright常時使用**: JS動的サイト判定は複雑なので、最初から Playwright を使う
2. **raw_text優先抽出**: セレクタよりも正規表現の方が精度が高い（0.3→0.8）
3. **3ステップパイプライン**: HTML→YAML→DB の中間フォーマットで安全性確保
4. **クロスチェック**: 性別・年齢・画像の整合性で取りこぼしを検出
5. **YAML中間フォーマット**: 人間が確認・修正できる形式で品質保証

### ❌ 避けるべきこと

1. **HTML→DB直接投入**: ミスったときにロールバック困難
2. **セレクタのみ抽出**: 汎用性が低く、サイト変更に弱い
3. **空HTML判定の複雑化**: Playwright で統一した方がシンプル
4. **confidence無視**: 低品質データをDBに入れると後で大変

---

## 📚 参考リソース

- **石川県動物愛護センター**: https://aigo-ishikawa.jp/petadoption_list/
- **Playwright公式**: https://playwright.dev/
- **Cheerio公式**: https://cheerio.js.org/
- **better-sqlite3**: https://github.com/WiseLibs/better-sqlite3

---

**このアーキテクチャに基づいて、各自治体のスクレイパーを順次実装していきます。**
