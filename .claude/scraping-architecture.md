# Tail Match - スクレイピングアーキテクチャ仕様

**最終更新**: 2025-11-13
**ステータス**: 全28施設実装完了、本格運用フェーズ

---

## 📚 このドキュメントの位置づけ

このドキュメントは**スクレイピングシステムの技術設計・アーキテクチャ仕様**を説明します。

- **設計方針**: なぜこのアーキテクチャを選んだのか
- **技術スタック選定理由**: なぜこの技術を使うのか
- **データフロー**: 3ステップパイプラインの概要と利点
- **ディレクトリ構造**: 規約とルール
- **設計レベルの教訓**: アーキテクチャから学んだこと

### 関連ドキュメント

- **[スクレイピング実装ガイド](./scraping-guide.md)** - 新規施設追加の実装手順（Step-by-Step）
- **[よくある間違い](./common-mistakes.md)** - 実装時のアンチパターンとベストプラクティス
- **[プロジェクト状況](../CLAUDE.md)** - 現在の進捗とタスク管理

**実装を始める前に**: 設計思想を理解したい場合はこのドキュメントを読み、実際に実装する場合は [scraping-guide.md](./scraping-guide.md) を参照してください。

---

## 🎯 設計方針（改訂版）

### 実証済みアーキテクチャ

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

## 📁 ディレクトリ構造（2025-11-13現在）

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

**詳細な命名規則**: [実装ガイド - 命名規則](./scraping-guide.md#命名規則) 参照

### ✅ 汎用化完了（2025-11-13）

共通ヘルパー関数を全28施設で使用中：

```
scripts/lib/
├── html-saver.js              # HTML保存（共通）
├── db.js                      # SQLite接続（共通）
├── adoption-status.js         # 譲渡済み判定（共通）★新規
└── animal-type.js             # 動物種判定（共通）★新規
```

**adoption-status.js の主要機能**:

- 包括的キーワード検出（譲渡済み、譲渡しました、※譲渡しました、里親決定など）
- 施設特有の表現にも対応（京都府「決まりました」など）
- 全28施設で統一使用

**animal-type.js の主要機能**:

- 多様な表記対応（犬/イヌ/いぬ/ワンちゃん/わんちゃん/ワンコ/わんこ）
- 猫も同様（猫/ネコ/ねこ/ニャンちゃん/にゃんちゃん/ニャンコ/にゃんこ）
- 混在ページでの動的判定に使用（4施設）

---

## 🔄 3ステップ処理フロー（実証済み）

### なぜ3ステップなのか？

| ステップ        | 失敗時の対応                             | 利点                                     |
| --------------- | ---------------------------------------- | ---------------------------------------- |
| **1. HTML収集** | 再実行すればOK（サイトが落ちてなければ） | HTMLが残れば何度でもパース可能           |
| **2. YAML抽出** | HTMLから再抽出（サイトアクセス不要）     | パーサーロジック改善時に全HTML再処理可能 |
| **3. DB投入**   | YAMLから再投入（パース不要）             | データ修正が容易、ロールバック可能       |

**実例**: 石川県でraw_text優先パーサーを実装した際、保存済みHTMLを再パースしてconfidence 0.3→0.8に改善できた。

### データフローの概要

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

**実装の詳細**: [実装ガイド - 3ステップ処理フロー](./scraping-guide.md#3ステップ処理フロー) 参照

---

## 📦 ファイル命名規則（2025-11-13統一）

### ディレクトリ命名規則

```
{prefecture}/{municipality}/        # municipality は -cats/-dogs サフィックス必須

例:
ishikawa/aigo-ishikawa/            # 混在ページ（サフィックスなし）
ishikawa/kanazawa-city-cats/       # 猫専用ページ
chiba/chiba-city-dogs/             # 犬専用ページ
```

### ファイル命名規則

```
{timestamp}_tail.html              # タイムスタンプ付きHTML（同階層に保存）
latest_metadata.json               # 最新実行の情報

例:
20251113_093045_tail.html          # 2025年11月13日 09:30:45 実行
```

**重要**:

- **archive/ サブディレクトリは使用しない**
- すべてのHTMLファイルは municipality ディレクトリ直下に保存
- タイムスタンプで履歴管理

### タイムスタンプ形式

```javascript
const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
// 結果: 20251113_093045
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

### スキーマ設計の要点

- **UNIQUE(municipality_id, external_id)**: 同じ施設内での個体識別子重複を防止
- **JSON フィールド**: 柔軟な構造化データ（images, contact_info, scraping_config）
- **TEXT 型の日付**: SQLiteではISO 8601形式の文字列を推奨
- **status フィールド**: 'available'（募集中）、'adopted'（譲渡済み）の2値

---

## 🔧 汎用化戦略

### ✅ 完全汎用化可能（すべての自治体で共通）

#### 1. Playwright HTML取得

```javascript
// scripts/lib/playwright-fetcher.js（概念的な実装）

import { chromium } from 'playwright';

export async function fetchDynamicHTML(url, options = {}) {
  const {
    waitTime = 5000, // JS実行待機時間（自治体ごと調整可能）
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

**設計意図**: どの自治体でも使える動的HTML取得。`waitTime`だけ調整すればOK。

---

#### 2. raw_text優先抽出パターン

```javascript
// scripts/lib/raw-text-extractor.js（概念的な実装）

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

**設計意図**: 自治体サイトの表記揺れに対応。複数パターンを試して最初にマッチしたものを使用。

**実績**: 石川県でconfidence 0.3→0.8に改善。

---

#### 3. クロスチェック機能

```javascript
// scripts/lib/cross-checker.js（概念的な実装）

export function performCrossCheck(html, extractedAnimals) {
  const $ = cheerio.load(html);
  const fullText = $('body').text();

  const stats = {
    gender_mentions: (fullText.match(/オス|メス|雄|雌|♂|♀|male|female/gi) || []).length,
    age_mentions: (fullText.match(/[0-9０-９]+歳|[0-9０-９]+ヶ月|推定年齢/g) || []).length,
    breed_mentions: (fullText.match(/種類|犬種|猫種|品種|ミックス|雑種/g) || []).length,
    image_tags: $('img').length,
  };

  const warnings = [];

  // 性別チェック（汎用）
  if (stats.gender_mentions < extractedAnimals.length * 0.8) {
    warnings.push(`性別表記(${stats.gender_mentions})が少ない`);
  }

  // 年齢チェック（汎用）
  if (stats.age_mentions > extractedAnimals.length * 1.5) {
    warnings.push(`年齢表記(${stats.age_mentions})が多すぎる - 取りこぼしの可能性`);
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

**設計意図**: どの自治体でも使える品質検証。性別・年齢・画像などは普遍的な指標。

**実績**: 石川県で年齢表記36個vs抽出18匹の不一致を検出（要確認フラグ）。

---

#### 4. YAML構造（汎用フォーマット）

```yaml
# すべての自治体で統一されたYAML構造

meta:
  municipality_id: 'ishikawa/aigo-ishikawa'
  scraped_at: '2025-11-13T19:47:44+09:00'
  source_url: 'https://...'

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
    status: 'available'
    confidence_score: 0.8 # 0.0-1.0
    extraction_method: 'raw_text_priority'
```

**設計意図**: すべての自治体で統一されたデータ形式。`confidence_level`で品質を可視化。

---

### 🏢 自治体ごとにカスタマイズが必要な部分

#### 1. セレクタパターン

```javascript
// scripts/scrapers/{prefecture}/{municipality}/config.js（概念）

export const SELECTORS = {
  container: '.data_box', // 動物情報のコンテナ（サイトごと異なる）
  name: '.animal-name',
  breed: '.animal-breed',
};
```

**理由**: HTMLの構造はサイトごとに完全に異なる。

---

#### 2. データマッピング

```javascript
// 自治体固有の正規化処理（概念）

export function normalizeData(rawData) {
  return {
    // 全角→半角の正規化
    age_estimate: rawData.age?.replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    ),

    // external_idの生成ルール
    external_id: `{municipality}_${rawData.protection_number}`,
  };
}
```

**理由**: 自治体ごとに表記方法が異なる（全角/半角、用語統一など）。

---

## 🚀 新規自治体追加について

新規自治体を追加する際の詳細な手順は **[スクレイピング実装ガイド](./scraping-guide.md)** を参照してください。

このドキュメントでは、以下の設計思想のみを説明しています：

- **汎用化戦略**: どの部分が共通化できるか
- **カスタマイズポイント**: どの部分が自治体固有か
- **設計の利点**: なぜこのアーキテクチャなのか

**実装時の参考資料**:

- [実装ガイド](./scraping-guide.md) - Step-by-Step手順
- [よくある間違い](./common-mistakes.md) - アンチパターン集

---

## 📊 実証結果（2025-11-13現在）

### 全体統計

- **実装済み施設数**: 28施設
  - 猫専用ページ: 17施設
  - 犬専用ページ: 7施設
  - 混在ページ: 4施設
- **共通ヘルパー関数**: 全28施設で使用
  - `getAdoptionStatus()`: 譲渡済み判定統一
  - `determineAnimalType()`: 動物種判定統一
- **命名規則統一**: `-cats`/`-dogs` サフィックス完備

### 石川県での実証結果（パイロット施設）

| 指標                 | Before               | After                    | 改善率 |
| -------------------- | -------------------- | ------------------------ | ------ |
| **HTMLサイズ**       | 1KB（空）            | 90KB                     | 9000%  |
| **抽出成功率**       | 0%                   | 100%（18/18匹）          | ∞      |
| **実名抽出**         | 0%（"保護動物1号"）  | 100%（"紅蘭（クラン）"） | ∞      |
| **犬種精度**         | 低（"ミックス"固定） | 高（"トイプードル"）     | -      |
| **confidence_score** | 0.3                  | 0.8                      | 167%   |

### パフォーマンス

- **HTML収集**: 約10秒（Playwright起動〜保存）
- **YAML抽出**: 約1秒（Cheerio解析 + 共通ヘルパー）
- **DB投入**: 約0.5秒（18匹分、UPSERT）
- **合計**: 約12秒/施設

### 品質保証（全28施設）

- 譲渡済み判定: 包括的キーワード検出（10種類）
- 動物種判定: 多様な表記対応（漢字・カタカナ・ひらがな・愛称）
- クロスチェック: 性別・年齢・画像の整合性検証
- 個体識別子: 重複防止サフィックス付与

---

## ✅ 設計の利点

1. **デバッグ容易** - HTMLが残っているので何度でもパースし直せる
2. **軽量** - SQLiteで十分、PostgreSQL不要
3. **貴重なデータ保護** - 掲載ありHTMLは絶対に上書きしない
4. **実績あり** - 28施設で安定稼働中

---

## 🔐 礼儀正しいスクレイピング

- リクエスト間隔: 3秒以上
- User-Agent設定: 明確な識別子
- robots.txt 遵守
- 深夜・早朝実行（サーバー負荷軽減）
- リトライ機能（最大3回、2秒間隔）
- タイムアウト: 30秒

---

## 🎓 学んだ教訓（設計レベル）

### ✅ やって良かったこと

1. **Playwright常時使用**: JS動的サイト判定は複雑なので、最初から Playwright を使う
2. **raw_text優先抽出**: セレクタよりも正規表現の方が精度が高い（0.3→0.8）
3. **3ステップパイプライン**: HTML→YAML→DB の中間フォーマットで安全性確保
4. **クロスチェック**: 性別・年齢・画像の整合性で取りこぼしを検出
5. **YAML中間フォーマット**: 人間が確認・修正できる形式で品質保証
6. **共通ヘルパー関数**: 譲渡済み判定・動物種判定をDRY原則で統一（2025-11-13）
7. **命名規則統一**: `-cats`/`-dogs` サフィックスで混在ページと明確に区別（2025-11-13）

### ❌ 避けるべきこと

1. **HTML→DB直接投入**: ミスったときにロールバック困難
2. **セレクタのみ抽出**: 汎用性が低く、サイト変更に弱い
3. **空HTML判定の複雑化**: Playwright で統一した方がシンプル
4. **confidence無視**: 低品質データをDBに入れると後で大変
5. **archive/ サブディレクトリ**: HTMLは同階層に保存する方がシンプル
6. **施設ごとの重複ロジック**: 共通化できるものは必ず共通ヘルパーにする

**実装レベルの教訓**: [よくある間違い](./common-mistakes.md) を参照

---

## 📚 参考リソース

### 関連ドキュメント

- **[スクレイピング実装ガイド](./scraping-guide.md)** - 新規施設追加の完全な手順
- **[よくある間違い](./common-mistakes.md)** - 過去の失敗から学んだ教訓
- **[プロジェクト状況管理](../CLAUDE.md)** - 現在の進捗とタスク管理

### 外部ライブラリ

- **Playwright公式**: https://playwright.dev/
- **Cheerio公式**: https://cheerio.js.org/
- **better-sqlite3**: https://github.com/WiseLibs/better-sqlite3
- **js-yaml**: https://github.com/nodeca/js-yaml

### 実装済み施設

- **石川県**: いしかわ動物愛護センター（混在）、金沢市（猫専用）
- **千葉県**: 千葉市（猫・犬各専用）、千葉県（猫・犬各専用）
- **福井県**: 福井県（猫・犬各専用）
- **神奈川県**: 神奈川県（猫・犬各専用）、横浜市（猫専用）
- **京都府**: 京都府（猫・犬各専用）
- **沖縄県**: 沖縄県（猫・犬各専用）、那覇市（混在）
- **富山県**: 富山県（猫・犬各専用）
- **大阪府**: 大阪府、大阪市、堺市（各猫専用）
- **兵庫県**: 兵庫県（猫専用）、神戸市（混在）
- **埼玉県**: 埼玉県、さいたま市（各猫専用）
- **東京都**: 東京都（猫専用）
- **北海道**: 北海道（混在）、札幌市（猫専用）

**合計**: 28施設（猫専用17 + 犬専用7 + 混在4）

---

**このアーキテクチャに基づいて、全28施設が安定稼働中です。新規施設追加時はこのドキュメントを参照してください。**
