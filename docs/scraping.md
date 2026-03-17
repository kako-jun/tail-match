# Tail Match - スクレイピング

## アーキテクチャ仕様

**最終更新**: 2025-11-13
**ステータス**: 全28施設実装完了、本格運用フェーズ

---

## このドキュメントの構成

- **[アーキテクチャ仕様](#アーキテクチャ仕様-1)** - 技術設計・設計方針・データフロー
- **[実装ガイド](#実装ガイド)** - 新規施設追加の Step-by-Step 手順

---

## アーキテクチャ仕様

### 設計方針

**3ステップパイプライン**（全28施設で運用中）

```
[1] HTML収集 (Playwright)
    ↓ data/html/{prefecture}/{municipality}/{timestamp}_tail.html
[2] YAML抽出 (Cheerio + 共通ヘルパー関数)
    ↓ data/yaml/{prefecture}/{municipality}/{timestamp}_tail.yaml
[3] DB投入 (better-sqlite3)
    ↓ data/tail-match.db
```

**実装状況**: 28施設（猫専用17 + 犬専用7 + 混在4）

### 技術スタック（確定版）

- **HTML収集**: Playwright 1.49.1（常時使用、JS動的レンダリング対応）
- **HTML解析**: cheerio（軽量・高速）
- **データ抽出**: 正規表現（raw_text優先、confidence 0.3→0.8に改善）
- **共通ヘルパー**: `adoption-status.js`, `animal-type.js`（全28施設で統一）
- **中間フォーマット**: YAML（js-yaml、人間が確認・修正可能）
- **データベース**: SQLite (`better-sqlite3`)
- **品質保証**: クロスチェック機能（性別/年齢/画像の整合性検証）

### なぜこの技術スタックなのか？

#### Playwright を常時使用する理由

1. **現代的なウェブサイトの実態**: 大半の自治体サイトでJavaScript動的レンダリングが使われている
2. **シンプルな実装**: 「静的HTMLで取れるか判定」よりも「常にPlaywright」の方が保守が容易
3. **実証済み**: 石川県でHTMLサイズ1KB→90KBの改善実績

#### raw_text優先抽出の理由

1. **セレクタの脆弱性**: HTMLセレクタはサイト変更に弱い
2. **汎用性**: 正規表現ベースは多様な表記揺れに対応しやすい
3. **実証済み**: 石川県でconfidence 0.3→0.8の改善実績

#### YAML中間フォーマットの理由

1. **人間が確認・修正可能**: 自動抽出の精度が100%でなくても問題ない
2. **デバッグ容易**: パーサーロジック改善時に全HTML再処理可能
3. **ロールバック可能**: DB投入前に品質確認できる

#### SQLiteを選んだ理由

1. **軽量**: PostgreSQL不要、ファイルベースで管理が容易
2. **十分な性能**: 数千〜数万レコード程度なら問題なし
3. **バージョン管理可能**: GitHubにコミットできる

---

### ディレクトリ構造（2025-11-13現在）

```
tail-match/
├── data/
│   ├── tail-match.db              # SQLite データベース（バージョン管理対象）
│   ├── html/                      # 収集したHTML（全保存）
│   │   └── {prefecture}/
│   │       └── {municipality}/
│   │           ├── latest_metadata.json    # 最新実行の情報
│   │           └── {timestamp}_tail.html   # タイムスタンプ付きHTML（同階層）
│   └── yaml/                      # 抽出済みYAML（検証・修正可能）
│       └── {prefecture}/
│           └── {municipality}/
│               └── {timestamp}_tail.yaml
├── scripts/
│   ├── lib/
│   │   ├── html-saver.js          # HTML保存（共通）
│   │   ├── db.js                  # SQLite接続（共通）
│   │   ├── adoption-status.js     # 譲渡済み判定（共通）★2025-11-13追加
│   │   └── animal-type.js         # 動物種判定（共通）★2025-11-13追加
│   ├── scrapers/                  # 【自治体ごとのスクレイパー】
│   │   ├── ishikawa/              # 石川県（実装完了）
│   │   │   ├── aigo-ishikawa/
│   │   │   │   ├── scrape.js          # HTML収集
│   │   │   │   ├── html-to-yaml.js    # YAML抽出
│   │   │   │   └── README.md          # 実行方法・実績データ
│   │   │   └── kanazawa-city-cats/    # 金沢市（猫専用）
│   │   ├── chiba/                 # 千葉県（猫・犬各1施設）
│   │   │   ├── chiba-city-cats/
│   │   │   └── chiba-city-dogs/
│   │   └── ... （全28施設）
│   └── yaml-to-db.js              # YAML→DB投入（汎用化済み）
└── database/
    └── schema.sql                 # SQLite スキーマ定義
```

### 命名規則（2025-11-13統一完了）

- 猫専用ページ: `-cats` サフィックス（17施設）
- 犬専用ページ: `-dogs` サフィックス（7施設）
- 混在ページ: サフィックスなし（4施設）

```
{prefecture}/{municipality}/        # municipality は -cats/-dogs サフィックス必須

例:
ishikawa/aigo-ishikawa/            # 混在ページ（サフィックスなし）
ishikawa/kanazawa-city-cats/       # 猫専用ページ
chiba/chiba-city-dogs/             # 犬専用ページ
```

---

### 3ステップ処理フロー（実証済み）

| ステップ        | 失敗時の対応                             | 利点                                     |
| --------------- | ---------------------------------------- | ---------------------------------------- |
| **1. HTML収集** | 再実行すればOK（サイトが落ちてなければ） | HTMLが残れば何度でもパース可能           |
| **2. YAML抽出** | HTMLから再抽出（サイトアクセス不要）     | パーサーロジック改善時に全HTML再処理可能 |
| **3. DB投入**   | YAMLから再投入（パース不要）             | データ修正が容易、ロールバック可能       |

```
[Step 1: HTML収集]
- Playwrightで動的レンダリング
- 5秒待機してHTML取得
- タイムスタンプ付きで保存
↓
data/html/{prefecture}/{municipality}/{timestamp}_tail.html

[Step 2: YAML抽出]
- Cheerioで解析
- raw_text優先抽出（正規表現）
- 共通ヘルパー関数で譲渡済み・動物種判定
- クロスチェックで品質検証
↓
data/yaml/{prefecture}/{municipality}/{timestamp}_tail.yaml

[Step 3: DB投入]
- YAMLファイル読み込み
- confidence_level チェック
- SQLiteにUPSERT
↓
data/tail-match.db
```

---

### SQLite スキーマ

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

**スキーマ設計の要点**:
- `UNIQUE(municipality_id, external_id)`: 同じ施設内での個体識別子重複を防止
- JSON フィールド: 柔軟な構造化データ（images, contact_info, scraping_config）
- TEXT 型の日付: SQLiteではISO 8601形式の文字列を推奨
- status フィールド: 'available'（募集中）、'adopted'（譲渡済み）の2値

---

### 汎用化戦略

#### 完全汎用化可能（すべての自治体で共通）

**1. Playwright HTML取得**

```javascript
export async function fetchDynamicHTML(url, options = {}) {
  const {
    waitTime = 5000,
    timeout = 30000,
    viewport = { width: 1920, height: 1080 },
  } = options;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  await page.goto(url, { timeout, waitUntil: 'networkidle' });
  await page.waitForTimeout(waitTime);

  const html = await page.content();
  await browser.close();
  return html;
}
```

**2. raw_text優先抽出パターン**

```javascript
export const COMMON_PATTERNS = {
  name: [
    /仮名\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
    /名前\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
  ],
  breed: [/種類\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/],
  age: [/推定年齢\s*[:：]?\s*([^\s性別毛色体重更新日]+)/],
  gender: [/性別\s*[:：]?\s*(オス|メス|雄|雌|♂|♀|male|female)/i],
};
```

**3. YAML構造（汎用フォーマット）**

```yaml
meta:
  municipality_id: 'ishikawa/aigo-ishikawa'
  scraped_at: '2025-11-13T19:47:44+09:00'
  source_url: 'https://...'

cross_check:
  confidence_level: 'medium' # high / medium / low / critical

animals:
  - external_id: 'ishikawa_001'
    name: '紅蘭（クラン）'
    animal_type: 'dog'
    status: 'available'
    confidence_score: 0.8
```

#### 自治体ごとにカスタマイズが必要な部分

- **セレクタパターン**: HTMLの構造はサイトごとに完全に異なる
- **データマッピング**: 全角/半角、用語統一などは自治体固有

---

### 礼儀正しいスクレイピング

- リクエスト間隔: 3秒以上
- User-Agent設定: `TailMatchBot/1.0 (Tail Match Animal Rescue Service; +https://tail-match.llll-ll.com)`
- robots.txt 遵守
- 深夜・早朝実行（サーバー負荷軽減）
- リトライ機能（最大3回、2秒間隔）
- タイムアウト: 30秒

---

### 実証結果（2025-11-13現在）

| 指標                 | Before               | After                    | 改善率 |
| -------------------- | -------------------- | ------------------------ | ------ |
| **HTMLサイズ**       | 1KB（空）            | 90KB                     | 9000%  |
| **抽出成功率**       | 0%                   | 100%（18/18匹）          | ∞      |
| **confidence_score** | 0.3                  | 0.8                      | 167%   |

- **実装済み施設数**: 28施設（猫専用17 + 犬専用7 + 混在4）
- **パフォーマンス**: 約12秒/施設（HTML収集10秒 + YAML抽出1秒 + DB投入0.5秒）

---

## 実装ガイド

### 命名規則（2025-11-13統一完了）

**ディレクトリ名とmunicipality設定には必ずサフィックスを付ける**

| ページ種別     | サフィックス | 例                      |
| -------------- | ------------ | ----------------------- |
| 猫専用ページ   | `-cats`      | `chiba/chiba-city-cats` |
| 犬専用ページ   | `-dogs`      | `chiba/chiba-city-dogs` |
| 犬猫混在ページ | なし         | `okinawa/naha-city`     |

---

### 新規自治体追加手順

#### Step 0: シェルター情報の確認（最重要）

**まず最初に** `data/shelters.yaml` を確認してください。

**確認すべき情報**:
- `website_url`: 公式サイトURL
- `adoption_page_url`: 譲渡ページURL（これを使う）
- `site_analysis.investigated`: 調査済みか
- `scraping_config`: スクレイピング設定（あれば参考にする）

URLが404の場合はWeb検索で最新URLを探す。

#### Step 1: 調査

1. `data/shelters.yaml` から対象サイトのURLを確認（最重要）
2. ブラウザでHTMLを確認（DevToolsでセレクタを調査）
3. JavaScript必須か確認（ほとんどの場合、Playwright必須）
4. 既存のHTMLサンプルを取得

   ```bash
   curl -o sample.html "対象URL"
   ```

5. 犬用ページが別URLで存在しないか確認（例: cat.html → dog.html）
6. 画像OCR方式か確認（OCR方式は原則として避ける）
   - 既存のOCR施設: 名古屋市、堺市、横浜市

#### Step 1.5: shelters.yaml の更新（重要）

施設の構造を理解した時点で、**必ず** `data/shelters.yaml` を更新する。

```yaml
- name: '○○動物愛護センター'
  status: 'pending'
  page_type: 'separate' # separate / cat_only / dog_only / mixed
  url_cats: 'https://...'
  url_dogs: 'https://...'
  notes: 'HTML構造のメモ'
```

#### Step 2: スクレイパーフォルダ作成

```bash
# 猫専用ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}-cats

# 犬専用ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}-dogs

# 犬猫混在ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}
```

#### Step 3: scrape.js 作成

**既存のスクレイパーをコピー**して修正:

```bash
cp scripts/scrapers/chiba/chiba-city-cats/scrape.js scripts/scrapers/{new-location}/scrape.js
```

**修正する箇所**:

```javascript
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

const CONFIG = {
  municipality: 'ishikawa/kanazawa-city-cats', // パス形式 + サフィックス
  url: '対象URL',
};

const timestamp = getJSTTimestamp(); // YYYYMMDD_HHMMSS形式

const metadata = {
  timestamp: timestamp,
  scraped_at: getJSTISOString(), // ISO 8601形式（+09:00付き）
};
```

#### Step 4: html-to-yaml.js 作成

**既存のパーサーをコピー**して修正:

```javascript
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { determineAnimalType } from '../../../lib/animal-type.js'; // 犬猫混在ページのみ

const CONFIG = {
  municipality: 'ishikawa/kanazawa-city-cats',
  base_url: 'https://example.com',
  source_url: '対象URL',
};
```

**YAML出力構造（metaセクション必須）**:

```javascript
// 正しい構造
const yamlContent = yaml.dump(
  {
    meta: {
      source_file: `${timestamp}_tail.html`,
      source_url: CONFIG.source_url,
      extracted_at: getJSTISOString(),
      municipality: CONFIG.municipality,
      total_count: allCats.length,
    },
    animals: allCats,
  },
  { indent: 2, lineWidth: -1 }
);
```

**共通ヘルパー関数の使用**:

```javascript
// 譲渡済み判定（全施設必須）
const status = getAdoptionStatus(detailText + ' ' + heading);

// 動物種判定（犬猫混在ページのみ）
const animal_type = determineAnimalType(fullText, 'cat');

// 猫専用・犬専用ページの場合は固定値
const animal_type = 'cat'; // または 'dog'
```

#### Step 4.5: 履歴ロガー統合（必須）

**scrape.js に追加**:

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  try {
    const html = await page.content();
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);
    // HTML保存...
    logger.finalize();
  } catch (error) {
    logger.logError(error);
    logger.finalize();
    throw error;
  } finally {
    await browser?.close();
  }
}

function countAnimalsInHTML(html) {
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) return tableRows.length - 1;

  const cards = html.match(/<div[^>]*class="[^"]*animal-card[^"]*"[^>]*>/gi);
  if (cards) return cards.length;

  const links = html.match(/<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi);
  if (links) return links.length;

  return 0;
}
```

**html-to-yaml.js に追加**:

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  try {
    const animals = [];
    logger.logYAMLCount(animals.length);
    // YAML保存...
    logger.finalize();
  } catch (error) {
    logger.logError(error);
    logger.finalize();
    throw error;
  }
}
```

**shelters-history.yaml への追加**:

```yaml
scrapers:
  {prefecture}/{municipality}:
    name: "施設名"
    page_type: "cat_only"
    verified: false
    last_success: null
    last_error: null
    total_runs: 0
    success_count: 0
    error_count: 0
    mismatch_count: 0
    last_10_runs: []
```

#### Step 5: テスト実行

```bash
# HTML収集
node scripts/scrapers/{municipality}/scrape.js

# YAML抽出
node scripts/scrapers/{municipality}/html-to-yaml.js
```

**確認ポイント**:
- ファイルサイズが十分か（1KB以下なら失敗）
- 動物が正しく抽出されたか
- animal_type, status, 画像URLが正しいか
- 信頼度が HIGH または MEDIUM か

もし0匹抽出された場合:

```bash
# セレクタを確認
grep -n "期待するセレクタ" data/html/{prefecture}/{municipality}/*.html
```

#### Step 6: README作成

```bash
cat > scripts/scrapers/{municipality}/README.md << 'EOF'
# {自治体名} スクレイパー

## 概要
- URL: {URL}
- Municipality ID: {municipality}

## 実行方法
1. HTML収集: `node scripts/scrapers/{municipality}/scrape.js`
2. YAML抽出: `node scripts/scrapers/{municipality}/html-to-yaml.js`
EOF
```

#### Step 7: 最終チェックリスト（DB投入前に必ず確認）

**1. YAML構造チェック**:

```bash
head -20 data/yaml/{prefecture}/{municipality}/*.yaml
```

必須要素: `meta:` セクション、`meta.source_file`、`meta.source_url`、`meta.extracted_at`、`meta.municipality`、`animals:` 配列

**2. yaml-to-db.js の municipalities 配列チェック**:

```javascript
const CONFIG = {
  municipalities: [
    'ishikawa/aigo-ishikawa',
    'fukui/fukui-pref', // 追加を忘れずに！
  ],
};
```

**3. import paths チェック** — 県階層がある場合は `../../../lib/`:

```javascript
import { saveHtml } from '../../../lib/html-saver.js'; // 正しい
```

**4. municipality パス形式チェック** — `{prefecture}/{municipality}` 形式で指定

**5. 共通ヘルパー関数の使用チェック**:

```bash
grep "getAdoptionStatus\|determineAnimalType" scripts/scrapers/{prefecture}/{municipality}/html-to-yaml.js
```

#### Step 8: yaml-to-db.js に追加

Step 7の2を実施してください。

#### Step 8.5: shelters.yaml の更新（実装完了時）

```yaml
- name: '広島県動物愛護センター'
  status: 'implemented' # pending → implemented に変更
  scraper_path: 'scripts/scrapers/hiroshima/hiroshima-pref-cats, ...'
  notes: '実装完了 (2025-11-13)'
```

#### Step 8.6: shelters-history.yaml の古い施設削除

命名規則変更やURL変更で古くなった施設は手動で削除し、`metadata.total_scrapers` も更新する。

#### Step 9: DB投入

```bash
# DRY-RUN（確認のみ）
node scripts/core/yaml-to-db.js --dry-run

# 本番投入
node scripts/core/yaml-to-db.js
```

#### Step 10: コミット（必須手順）

```bash
# 最新データのコピー
for facility in ...; do
  cp scripts/scrapers/{prefecture}/$facility/data/html/{prefecture}/$facility/*.html data/html/{prefecture}/$facility/
  cp scripts/scrapers/{prefecture}/$facility/data/yaml/{prefecture}/$facility/*_tail.yaml data/yaml/{prefecture}/$facility/
done

# クリーンナップ実行
node scripts/core/cleanup-html-yaml.js

# スクレイパーコードのコミット
git add scripts/scrapers/{prefecture}/{municipality}/ data/shelters-history.yaml
git commit -m "feat: {施設名}のスクレイパー実装（{動物種}）"

# データファイルのコミット
git add data/html/{prefecture}/ data/yaml/{prefecture}/
git commit -m "data: {施設名}のデータ追加（猫X匹・犬Y匹）"
```

---

### 個体識別子の重複防止（2025-11-12追加）

1つの管理番号に複数の個体が含まれる場合はサフィックスで一意化する:

```javascript
// 管理番号が不足している場合、サフィックスで一意化
const externalId = `${baseId}-${i + 1}`; // "HC25374-1", "HC25374-2", ...
```

チェックリスト:
- [ ] 1つの管理番号に複数の個体が存在する可能性を確認
- [ ] external_id生成ロジックにサフィックス付与機能を実装
- [ ] `node scripts/core/yaml-to-db.js --dry-run` で制約エラーがないことを確認

---

### トラブルシューティング

| 問題 | 原因 | 対応 |
|------|------|------|
| 動物が0匹抽出される | セレクタが間違い、または犬用ページを見逃し | HTMLでセレクタを確認、`div.wysiwyg > table` → `div.wysiwyg table` に緩める |
| 画像URLが空 | 画像の取得方法が間違い | `.closest()` や `.prev()` の対象を調整 |
| HTMLサイズが小さい（1KB以下） | JS動的レンダリングが必要 | `wait_for_js` を増やす（5000 → 10000） |

---

### 設計の学び

**やって良かったこと**:
1. Playwright常時使用（JS動的サイト判定を排除）
2. raw_text優先抽出（confidence 0.3→0.8に改善）
3. 3ステップパイプライン（HTML→YAML→DB）
4. 共通ヘルパー関数（DRY原則）
5. 命名規則統一（-cats/-dogsサフィックス）

**避けるべきこと**:
1. HTML→DB直接投入（ロールバック困難）
2. セレクタのみ抽出（サイト変更に弱い）
3. archive/ サブディレクトリ（HTMLは同階層に保存）
4. 施設ごとの重複ロジック（共通化する）
