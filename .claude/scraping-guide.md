# スクレイピング実装ガイド

このファイルは新規自治体のスクレイパーを追加する際の完全な手順書です。

## 📚 関連ドキュメント

- **[scraping-architecture.md](./scraping-architecture.md)** - アーキテクチャ設計思想（なぜこの設計なのか）
- **[common-mistakes.md](./common-mistakes.md)** - よくある間違いとベストプラクティス
- **[CLAUDE.md](../CLAUDE.md)** - プロジェクト全体の状況管理

> 💡 **ヒント**: 実装前に [scraping-architecture.md](./scraping-architecture.md) で設計思想を理解し、[common-mistakes.md](./common-mistakes.md) でよくある失敗を確認してください。

---

## 📝 命名規則（2025-11-13統一完了）

**ディレクトリ名とmunicipality設定には必ずサフィックスを付ける**

| ページ種別     | サフィックス | 例                      |
| -------------- | ------------ | ----------------------- |
| 猫専用ページ   | `-cats`      | `chiba/chiba-city-cats` |
| 犬専用ページ   | `-dogs`      | `chiba/chiba-city-dogs` |
| 犬猫混在ページ | なし         | `okinawa/naha-city`     |

**理由**: 犬用ページに `-dogs` が付いているのに猫用ページにサフィックスがないと統一感がなく、混在ページとの区別もつかない。

**例**:

```javascript
// ✅ 正しい命名
'chiba/chiba-city-cats'; // 猫専用
'chiba/chiba-city-dogs'; // 犬専用
'okinawa/naha-city'; // 混在ページ

// ❌ 間違い（旧形式）
'chiba/chiba-city'; // 猫専用なのにサフィックスなし
```

---

## ✅ 正しいファイル構造

```
data/
├── html/
│   └── {prefecture}/
│       └── {municipality}/
│           ├── YYYYMMDD_HHMMSS_tail.html  # タイムスタンプ付きHTML
│           └── latest_metadata.json        # 最新メタデータ
└── yaml/
    └── {prefecture}/
        └── {municipality}/
            └── YYYYMMDD_HHMMSS_tail.yaml   # タイムスタンプ付きYAML
```

### 具体例（石川県）

```
data/
├── html/
│   └── ishikawa/
│       ├── aigo-ishikawa/
│       │   ├── 20251111_194744_tail.html
│       │   └── latest_metadata.json
│       └── kanazawa-city/
│           ├── 20251112_114924_tail.html
│           └── latest_metadata.json
└── yaml/
    └── ishikawa/
        ├── aigo-ishikawa/
        │   └── 20251111_194744_tail.yaml
        └── kanazawa-city/
            └── 20251112_025210_tail.yaml
```

---

## 📋 新規自治体追加手順

### Step 0: シェルター情報の確認（最重要）

**まず最初に** `.claude/shelters/` のYAMLファイルを確認してください：

```bash
# 対象地域のYAMLファイルを確認（例：中部地方の福井県）
grep -A 20 "福井" .claude/shelters/chubu.yaml

# または地域別に確認
ls .claude/shelters/
# → chubu.yaml, kanto.yaml, kinki.yaml など
```

**確認すべき情報**:

- `website_url`: 公式サイトURL
- `adoption_page_url`: 譲渡ページURL（⚠️ これを使う）
- `phone`, `address`: 連絡先情報
- `site_analysis.investigated`: 調査済みか
- `scraping_config`: スクレイピング設定（あれば参考にする）

**例（福井県の場合）**:

```yaml
- id: 'fukui_18_main'
  prefecture_code: '18'
  prefecture_name: '福井県'
  name: '福井県動物愛護管理センター'
  contact_info:
    website_url: 'https://www.pref.fukui.lg.jp/...'
    adoption_page_url: 'https://www.pref.fukui.lg.jp/...' # ⚠️ 404の可能性
    phone: '0776-38-1135'
```

⚠️ **URLが404の場合**: Web検索で最新URLを探す（外部サイトの可能性もある）

### Step 1: 調査

1. **`.claude/shelters/`から対象サイトのURLを確認** ⚠️ 最重要
2. **ブラウザでHTMLを確認**（DevToolsでセレクタを調査）
3. **JavaScript必須か確認**（ほとんどの場合、Playwright必須）
4. **既存のHTMLサンプルを取得**

   ```bash
   curl -o sample.html "対象URL"
   ```

5. **YAMLに構造をメモ**
   - どのセレクタで動物データ（猫・犬）が取得できるか
   - 画像、名前、年齢、性別、animal_type などの取得方法
   - ⚠️ **犬用ページが別URLで存在しないか確認**（例: cat.html → dog.html）
   - ⚠️ **譲渡済み情報の確認**（status: available/adopted/removed の判定方法）

### Step 1.5: shelters.yaml の更新（⚠️ 重要）

施設の構造を理解した時点で、**必ず** `.claude/shelters.yaml` を更新してください。

**更新する項目**:

```yaml
- name: '○○動物愛護センター'
  status: 'pending' # 調査中は pending のまま
  page_type: 'separate' # separate / cat_only / dog_only / mixed
  url_cats: 'https://...' # 猫専用URL（separate の場合）
  url_dogs: 'https://...' # 犬専用URL（separate の場合）
  notes: 'HTML構造のメモ（例: h4/h5/img/ul パターン、table構造など）'
```

**page_type の選択基準**:

- `separate`: 猫と犬で別々のページ（例: neko.html と inu.html）
- `cat_only`: 猫のみのページ
- `dog_only`: 犬のみのページ
- `mixed`: 同じページに猫と犬が混在

**更新例**:

```yaml
# 修正前
- name: '宮城県動物愛護センター'
  status: 'pending'
  page_type: 'unknown'
  url: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/'

# 修正後
- name: '宮城県動物愛護センター'
  status: 'pending' # 実装中は pending のまま
  page_type: 'separate'
  url: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/'
  url_cats: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/zyoutoneko.html'
  url_dogs: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/jyoto-inu-syokai.html'
  notes: '猫: h4【名前】/h5性別年齢/img/ul構造。犬: h3 ID名前/h5/img/ul構造'
```

### Step 2: スクレイパーフォルダ作成

⚠️ **命名規則に従ってサフィックスを付けること**

```bash
# 猫専用ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}-cats

# 犬専用ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}-dogs

# 犬猫混在ページの場合
mkdir -p scripts/scrapers/{prefecture}/{municipality}
```

**例**:

- 猫専用: `scripts/scrapers/kanagawa/kanagawa-pref-cats`
- 犬専用: `scripts/scrapers/kanagawa/kanagawa-pref-dogs`
- 混在: `scripts/scrapers/okinawa/naha-city`

### Step 3: scrape.js 作成

**既存のスクレイパーをコピー**して修正：

```bash
# 猫専用ページの場合
cp scripts/scrapers/chiba/chiba-city-cats/scrape.js scripts/scrapers/{new-location}/scrape.js

# 犬専用ページの場合
cp scripts/scrapers/chiba/chiba-city-dogs/scrape.js scripts/scrapers/{new-location}/scrape.js
```

**修正する箇所**:

```javascript
// ⚠️ 必須: タイムスタンプ関数をインポート
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

const CONFIG = {
  municipality: 'ishikawa/kanazawa-city-cats', // ⚠️ パス形式 + サフィックス
  url: '対象URL',
  expected_selectors: 'セレクタ', // ⚠️ 実際のHTMLに合わせる
  // ...
};

// ⚠️ タイムスタンプ生成（日本時間JST）
const timestamp = getJSTTimestamp(); // YYYYMMDD_HHMMSS形式

// メタデータ用タイムスタンプ
const metadata = {
  timestamp: timestamp,
  scraped_at: getJSTISOString(), // ISO 8601形式（+09:00付き）
  // ...
};
```

### Step 4: html-to-yaml.js 作成

**既存のパーサーをコピー**して修正：

```bash
cp scripts/scrapers/{existing_municipality}/html-to-yaml.js scripts/scrapers/{new_municipality}/html-to-yaml.js
```

**修正する箇所**:

```javascript
// ⚠️ 必須: タイムスタンプ関数をインポート
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

// ✅ 新規（2025-11-13）: 共通ヘルパー関数をインポート
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { determineAnimalType } from '../../../lib/animal-type.js'; // 犬猫混在ページのみ

const CONFIG = {
  municipality: 'ishikawa/kanazawa-city-cats', // ⚠️ パス形式 + サフィックス
  base_url: 'https://example.com',
  source_url: '対象URL',
};

// ⚠️ タイムスタンプ生成（日本時間JST）
const timestamp = getJSTTimestamp(); // YYYYMMDD_HHMMSS形式
```

**⚠️ 重要: YAML出力構造（metaセクション必須）**:

```javascript
// ✅ 正しい構造（metaセクションがある + 日本時間タイムスタンプ）
const yamlContent = yaml.dump(
  {
    meta: {
      source_file: `${timestamp}_tail.html`,
      source_url: CONFIG.source_url,
      extracted_at: getJSTISOString(), // ⚠️ 日本時間を使用
      municipality: CONFIG.municipality,
      total_count: allCats.length,
    },
    animals: allCats,
  },
  { indent: 2, lineWidth: -1 }
);

// ❌ 間違い（metaセクションがない）
const yamlContent = yaml.dump(
  {
    municipality: CONFIG.municipality, // トップレベルはNG
    source_url: CONFIG.source_url, // トップレベルはNG
    scraped_at: new Date().toISOString(),
    total_count: allCats.length,
    animals: allCats,
  },
  { indent: 2, lineWidth: -1 }
);
```

**抽出ロジックを修正**:

- セレクタを実際のHTMLに合わせる
- 画像、名前、年齢、性別などの取得方法を調整

**✅ 共通ヘルパー関数の使用**（2025-11-13追加）:

#### 1. 譲渡済み判定（全施設必須）

```javascript
// ✅ 正しい使い方
const status = getAdoptionStatus(detailText + ' ' + heading);

// 以下のキーワードが自動検出される：
// - 譲渡済み、譲渡しました、譲渡決定
// - ※譲渡しました、新しい飼い主さんが決まりました
// - 決まりました、譲渡先決定、里親決定
// - 引き取られました、飼い主が決まりました

// ❌ 間違い（手動で判定しない）
const isAdopted = text.includes('譲渡済み') || text.includes('譲渡しました');
const status = isAdopted ? 'adopted' : 'available';
```

#### 2. 動物種判定（犬猫混在ページのみ）

```javascript
// ✅ 正しい使い方（混在ページの場合）
const animal_type = determineAnimalType(fullText, 'cat'); // デフォルトは'cat'

// 以下のキーワードが自動検出される：
// 【犬】犬、イヌ、いぬ、ワンちゃん、わんちゃん、ワンコ、わんこ、dog
// 【猫】猫、ネコ、ねこ、ニャンちゃん、にゃんちゃん、ニャンコ、にゃんこ、cat

// ✅ 猫専用ページの場合（固定値）
const animal_type = 'cat';

// ✅ 犬専用ページの場合（固定値）
const animal_type = 'dog';

// ❌ 間違い（「ワンちゃん」「わんちゃん」などが漏れる）
const animal_type = /犬|イヌ|dog/i.test(text) ? 'dog' : 'cat';
```

### Step 4.5: 履歴ロガー統合（必須）

**全てのスクレイパーに履歴ロガーを統合する必要があります。**

#### 4.5-1. scrape.js に追加

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  try {
    // HTML取得処理...
    const html = await page.content();

    // ⚠️ 施設固有のHTML内動物数カウント（必須）
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // HTML保存...
  } catch (error) {
    logger.logError(error);
    throw error;
  } finally {
    await browser?.close();
    // ⚠️ finalize()はyaml-to-db.jsで呼ぶのでここでは呼ばない
  }
}

// ⚠️ 施設ごとにHTML構造が異なるため、カスタム実装が必要
function countAnimalsInHTML(html) {
  // 例1: テーブル行をカウント（ヘッダー除外）
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    return tableRows.length - 1;
  }

  // 例2: カード形式をカウント
  const cards = html.match(/<div[^>]*class="[^"]*animal-card[^"]*"[^>]*>/gi);
  if (cards) return cards.length;

  // 例3: 詳細リンクをカウント
  const links = html.match(/<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi);
  if (links) return links.length;

  return 0;
}
```

**⚠️ 重要**: `logger`は`main()`関数内でのみ使用してください。`fetchWithRetry()`などの他の関数内で呼ぶとスコープエラーになります。

#### 4.5-2. html-to-yaml.js に追加

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);

  try {
    // HTML読み込み・YAML抽出処理...
    const animals = [];

    // ⚠️ YAML抽出後の動物数を記録（自動的にHTML→YAMLの不一致を検出）
    logger.logYAMLCount(animals.length);

    // YAML保存...
  } catch (error) {
    logger.logError(error);
    throw error;
  }
  // ⚠️ finalize()はyaml-to-db.jsで呼ぶのでここでは呼ばない
}
```

#### 4.5-3. shelters-history.yaml への追加

新規施設を `.claude/shelters-history.yaml` に登録：

```yaml
scrapers:
  {prefecture}/{municipality}:
    name: "施設名"
    page_type: "cat_only" # or "dog_only" or "mixed"
    verified: false
    last_success: null
    last_error: null
    total_runs: 0
    success_count: 0
    error_count: 0
    mismatch_count: 0
    last_10_runs: []
```

**参考資料**:

- `.claude/history-logger-guide.md` - 詳細な統合方法
- `scripts/SCRAPER_COUNT_PATTERNS.md` - 既存施設のカウントパターン例

### Step 5: テスト実行

#### 5-1. HTML収集

```bash
node scripts/scrapers/{municipality}/scrape.js
```

**確認ポイント**:

- ファイルサイズが十分か（1KB以下なら失敗）
- `data/html/{prefecture}/{municipality}/YYYYMMDD_HHMMSS_tail.html` が作成されたか

#### 5-2. YAML抽出

```bash
node scripts/scrapers/{municipality}/html-to-yaml.js
```

**確認ポイント**:

- 動物（猫・犬）が正しく抽出されたか
- animal_type が正しく設定されているか（'cat' または 'dog'）
- status が正しく設定されているか（'available', 'adopted', 'removed'）
- 画像URLが空でないか
- 信頼度が HIGH または MEDIUM か

#### 5-3. セレクタ修正

もし動物が0匹抽出された場合：

1. **HTMLでセレクタを確認**

   ```bash
   grep -n "期待するセレクタ" data/html/{prefecture}/{municipality}/*.html
   ```

2. **セレクタを修正して再実行**
   - `div.wysiwyg > table` → `div.wysiwyg table` のように、中間要素を考慮

3. **画像が空の場合**
   - DOM構造を確認（`.closest()` や `.prev()` の対象を調整）

### Step 6: README作成

```bash
cat > scripts/scrapers/{municipality}/README.md << 'EOF'
# {自治体名} スクレイパー

## 概要
- URL: {URL}
- Municipality ID: {municipality}

## HTML構造
{HTMLの特徴を記載}

## 実行方法
1. HTML収集: `node scripts/scrapers/{municipality}/scrape.js`
2. YAML抽出: `node scripts/scrapers/{municipality}/html-to-yaml.js`

## 実績データ
- 発見数: 猫X匹、犬Y匹
- animal_type: 正しく設定済み
- status: 譲渡済み情報も抽出済み
- 信頼度: HIGH
EOF
```

### Step 7: 最終チェックリスト（⚠️ 必須）

**DB投入前に必ず確認してください！よくあるミスを防ぎます。**

#### ✅ 1. YAML構造チェック

```bash
# YAMLファイルの先頭を確認
head -20 data/yaml/{prefecture}/{municipality}/*.yaml
```

**必須要素**:

- ✅ `meta:` セクションが存在する
- ✅ `meta.source_file` が設定されている
- ✅ `meta.source_url` が設定されている
- ✅ `meta.extracted_at` が設定されている
- ✅ `meta.municipality` が設定されている
- ✅ `animals:` 配列が存在する

**NG例**（metaがない）:

```yaml
municipality: fukui/fukui-pref # ❌ トップレベルにmunicipality
source_url: ... # ❌ トップレベルにsource_url
animals:
  - ...
```

**OK例**:

```yaml
meta: # ✅ metaセクション
  source_file: ...
  source_url: ...
  extracted_at: ...
  municipality: fukui/fukui-pref
animals:
  - ...
```

#### ✅ 2. yaml-to-db.js の municipalities 配列チェック

```bash
# 現在登録されている自治体を確認
grep -A 10 "municipalities:" scripts/core/yaml-to-db.js
```

**新しい自治体を追加**:

```javascript
const CONFIG = {
  municipalities: [
    'ishikawa/aigo-ishikawa',
    'ishikawa/kanazawa-city',
    'toyama/toyama-pref',
    'fukui/fukui-pref', // ⚠️ 追加を忘れずに！
  ],
  // ...
};
```

#### ✅ 3. import paths チェック

```bash
# scrape.js と html-to-yaml.js の import を確認
grep "from.*lib" scripts/scrapers/{prefecture}/{municipality}/*.js
```

**県階層がある場合は `../../../lib/`**:

```javascript
// ✅ 正しい（fukui/fukui-pref の場合）
import { saveHtml } from '../../../lib/html-saver.js';

// ❌ 間違い
import { saveHtml } from '../../lib/html-saver.js';
```

#### ✅ 4. municipality パス形式チェック

```bash
# scrape.js の CONFIG を確認
grep "municipality:" scripts/scrapers/{prefecture}/{municipality}/scrape.js
```

**パス形式で指定**:

```javascript
// ✅ 正しい
municipality: 'fukui/fukui-pref',

// ❌ 間違い
municipality: 'fukui-pref',
```

#### ✅ 5. 共通ヘルパー関数の使用チェック（2025-11-13追加）

```bash
# html-to-yaml.js で共通関数を使用しているか確認
grep "getAdoptionStatus\|determineAnimalType" scripts/scrapers/{prefecture}/{municipality}/html-to-yaml.js
```

**必須**:

```javascript
// ✅ 譲渡済み判定は全施設で必須
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
const status = getAdoptionStatus(text);

// ✅ 犬猫混在ページのみ必須
import { determineAnimalType } from '../../../lib/animal-type.js';
const animal_type = determineAnimalType(text, 'cat');
```

**NG例**（手動判定）:

```javascript
// ❌ 譲渡済み判定を手動で書かない
const status = text.includes('譲渡済み') ? 'adopted' : 'available';

// ❌ 動物種判定に「ワンちゃん」「わんちゃん」が抜けている
const animal_type = /犬|イヌ|dog/i.test(text) ? 'dog' : 'cat';
```

### Step 8: yaml-to-db.js に追加

**Step 7の✅2を実施してください。**

```javascript
const CONFIG = {
  municipalities: [
    'ishikawa/aigo-ishikawa',
    'ishikawa/kanazawa-city', // ⚠️ 追加
  ],
  // ...
};
```

### Step 9: DB投入

```bash
# DRY-RUN（確認のみ）
node scripts/core/yaml-to-db.js --dry-run

# 本番投入
node scripts/core/yaml-to-db.js
```

---

## 🔍 トラブルシューティング

### 問題: 動物が0匹抽出される

**原因**: セレクタが間違っている、または犬用ページを見逃している

**解決方法**:

1. HTMLファイルを直接確認

   ```bash
   grep -A 5 -B 5 "動物の名前" data/html/{prefecture}/{municipality}/*.html
   ```

2. **犬用ページの存在を確認**

   ```bash
   # 例: 猫用ページが cat.html なら dog.html を確認
   curl -I "猫用URLをdog用に変更したURL"
   ```

3. セレクタを緩くする
   - ❌ `div.wysiwyg > table` （直接の子要素のみ）
   - ✅ `div.wysiwyg table` （子孫要素すべて）

### 問題: 画像URLが空

**原因**: 画像の取得方法が間違っている

**解決方法**:

1. HTMLでfigureの位置を確認
2. `closest()` や `.prev()` の対象を調整

例（金沢市）:

```javascript
// ❌ これだと取得できない
const $figure = $table.closest('div').prev('figure.img-item');

// ✅ wysiwygの前にfigureがある
const $wysiwyg = $table.closest('div.wysiwyg');
const $figure = $wysiwyg.prev('figure.img-item');
```

### 問題: HTMLサイズが小さい（1KB以下）

**原因**: JavaScript動的レンダリングが必要

**解決方法**:

- Playwright の `wait_for_js` を増やす（5000 → 10000）
- セレクタ待機を追加

---

## 🔒 個体識別子の重複防止手順（2025-11-12追加）

**問題**: 1つの管理番号に複数の個体が含まれる場合、`external_id`が重複してデータベース制約違反が発生

**解決策**: サフィックス付与による一意化

**実装例（福井県の事例）**:

```javascript
// html-to-yaml.js の抽出ロジック

// 1. 管理番号と個体数を取得
const managementNumbers = parseManagementNumbers(title); // ["HC25374"]
const genderInfo = parseGenderString(specs['性別']); // 4匹（オス2匹、メス2匹）
const totalCats = Math.max(managementNumbers.length, genderInfo.length); // 4

// 2. external_id の生成ロジック
for (let i = 0; i < totalCats; i++) {
  let externalId;

  if (managementNumbers.length >= totalCats && managementNumbers[i]) {
    // ケース1: 管理番号が十分にある場合、そのまま使用
    externalId = managementNumbers[i]; // "HC25378", "HC25379", ...
  } else if (managementNumbers.length > 0) {
    // ケース2: 管理番号が不足している場合、サフィックスで一意化
    const baseId = managementNumbers[i] || managementNumbers[0];
    externalId = `${baseId}-${i + 1}`; // "HC25374-1", "HC25374-2", "HC25374-3", "HC25374-4"
  } else {
    // ケース3: 管理番号が全くない場合、タイムスタンプで一意化
    externalId = `{municipality}_unknown_${Date.now()}_${i}`;
  }

  // 3. 個体データの作成
  const cat = {
    external_id: externalId, // 必ず一意
    name: null, // デフォルト名は yaml-to-db.js で生成
    gender: genderInfo[i] ? genderInfo[i].gender : 'unknown',
    // ... 他のフィールド
  };
}
```

**チェックリスト（新規自治体実装時）**:

- [ ] 1つの管理番号に複数の個体が存在する可能性を確認
- [ ] `external_id`生成ロジックにサフィックス付与機能を実装
- [ ] テストデータで重複が発生しないことを確認
- [ ] `node scripts/core/yaml-to-db.js --dry-run`でFOREIGN KEY制約エラーがないことを確認

**デフォルト名の生成**（yaml-to-db.js）:

```javascript
function generateDefaultName(animal) {
  if (!animal.name || animal.name.includes('保護動物')) {
    // external_idから番号を抽出
    const idMatch = animal.external_id?.match(/\d+/);
    const number = idMatch ? idMatch[0] : 'unknown';

    // 動物種別に応じた名前を生成
    let prefix = '保護動物';
    if (animal.animal_type === 'cat') {
      prefix = '保護猫';
    }

    return `${prefix}${number}号`; // 例: "保護猫25374号"
  }
  return animal.name;
}
```

**実績データ**:

- 福井県: HC25374（4匹）→ HC25374-1, HC25374-2, HC25374-3, HC25374-4
- 福井県: FC25368（3匹）→ FC25368-1, FC25368-2, FC25368-3
- 福井県: HC25334（4匹）→ HC25334-1, HC25334-2, HC25334-3, HC25334-4

---

このガイドに従えば、新規自治体を効率的に追加できます。
