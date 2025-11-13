# 新規自治体追加ガイド（保存版）

**重要**: このガイドは金沢市動物愛護管理センター追加時の失敗から作成されました。必ず最後まで読んでください。

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

## ⚠️ よくある間違い（やってはいけないこと）

### ❌ 1. `scraper-python-backup` を使おうとする

- **このフォルダは凍結されたバックアップです**
- 現在のスクレイパーは **Node.js** ベース（`scripts/scrapers/`）

### ❌ 2. `archive` ディレクトリを作ろうとする

- HTMLファイルと `latest_metadata.json` は**同じ階層**に並べる
- ❌ `data/html/ishikawa/aigo-ishikawa/archive/20251112_tail.html`
- ✅ `data/html/ishikawa/aigo-ishikawa/20251112_tail.html`

### ❌ 3. 都道府県階層を省略する

- 都道府県名（例: `ishikawa`）の階層は**必須**
- ❌ `data/html/kanazawa-city/`
- ✅ `data/html/ishikawa/kanazawa-city/`

### ❌ 4. municipality設定を間違える

- municipality は**パス形式**で指定する
- ❌ `municipality: 'kanazawa-city'`
- ✅ `municipality: 'ishikawa/kanazawa-city'`

### ❌ 5. いちいちスクリプトで処理する

- ファイル移動などは直接コマンドを提案する
- スクリプトファイルを作成しない

### ❌ 6. `.claude/shelters/`を確認せずに進める

- **新規自治体追加時は必ず** `.claude/shelters/` のYAMLを最初に確認
- URLや連絡先情報が既に登録されている
- Web検索せずにまずローカルの情報を確認する

### ❌ 7. YAML出力時にmetaセクションを忘れる

- `yaml.dump()` の構造に**必ず `meta:` セクション**を含める
- ❌ トップレベルに `municipality`, `source_url` を配置
- ✅ `meta` オブジェクト内に配置

### ❌ 8. yaml-to-db.js の municipalities 配列に追加し忘れる

- 新規自治体を追加したら**必ず `CONFIG.municipalities` に追加**
- 追加しないとDB投入時にスキップされる
- Step 7の最終チェックリストで確認

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
grep -A 10 "municipalities:" scripts/yaml-to-db.js
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
node scripts/yaml-to-db.js --dry-run

# 本番投入
node scripts/yaml-to-db.js
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

## 📝 チェックリスト

新規自治体を追加する際は、以下を確認してください：

### 実装前

- [ ] 対象URLを確認した
- [ ] HTMLサンプルを取得した
- [ ] セレクタを調査した
- [ ] JavaScript必須か確認した

### 実装中

- [ ] municipality をパス形式で設定した（例: `'ishikawa/kanazawa-city'`）
- [ ] htmlDir に archive を含めていない
- [ ] セレクタを実際のHTMLに合わせた
- [ ] 画像取得のDOM構造を確認した
- [ ] 共通ヘルパー関数をインポートした（`getAdoptionStatus`, `determineAnimalType`）
- [ ] 譲渡済み判定に `getAdoptionStatus()` を使用した
- [ ] 犬猫混在ページの場合、`determineAnimalType()` を使用した

### 実装後

- [ ] HTML収集が成功した（ファイルサイズ確認）
- [ ] YAML抽出が成功した（動物が抽出された）
- [ ] animal_type が正しく設定されている（'cat' または 'dog'）
- [ ] status が正しく設定されている（'available', 'adopted', 'removed'）
- [ ] 犬用ページの存在確認を実施した
- [ ] 画像URLが空でない
- [ ] 信頼度が HIGH または MEDIUM
- [ ] README を作成した
- [ ] yaml-to-db.js に追加した

---

## 🎓 学んだ教訓

### 金沢市追加時

1. **archiveディレクトリは不要** - HTMLとmetadata.jsonは同じ階層
2. **都道府県階層は必須** - `ishikawa/` を省略してはいけない
3. **municipalityはパス形式** - `'ishikawa/kanazawa-city'` のように指定
4. **セレクタは緩く** - 中間要素（table-wrapperなど）を考慮する
5. **画像はDOM構造を確認** - `.closest()` や `.prev()` の対象を正確に
6. **直接コマンド実行** - ファイル移動などでスクリプトを作らない

### 那覇市・犬用ページ発見時（2025-11-12）

7. **犬も対象であることを忘れない** - プロジェクトは猫専用ではない
8. **犬用ページの存在確認は必須** - cat.html → dog.html のパターンが多い
9. **animal_type を明示的に設定** - 'cat' または 'dog' をハードコードしない
10. **status フィールドも必須** - 譲渡済み情報（available/adopted/removed）を抽出
11. **7施設で犬用ページを見逃していた** - 横断的なURL確認の重要性

### 共通ヘルパー関数導入時（2025-11-13）

12. **共通ロジックは必ず関数化する** - 全28施設で同じ判定ロジックを書かない
13. **「ワンちゃん」「わんちゃん」などの愛称表記を忘れない** - カタカナ・ひらがな・漢字すべてカバー
14. **譲渡済みキーワードは包括的に** - 施設ごとの表現の違いを吸収する
15. **共通関数は scripts/lib/ に配置** - 全スクレイパーからアクセス可能
16. **新規追加時は必ず共通関数を使用** - 手動判定を書かない

**共通化のメリット**:

- **一貫性**: 全施設で同じ検出精度
- **保守性**: キーワード追加は2ファイルのみ
- **品質**: ユニットテスト可能
- **拡張性**: 新しい動物種の追加が容易

### 命名規則統一時（2025-11-13）

17. **猫専用ページには `-cats` サフィックスを付ける** - 犬用ページとの統一感
18. **混在ページにはサフィックスを付けない** - 明確な区別
19. **命名規則は一貫性が最重要** - 将来の保守性に直結
20. **ディレクトリ名とmunicipality設定は必ず一致させる** - データの整合性を保つ

**命名規則の重要性**:

- **可読性**: 一目でページ種別が分かる
- **保守性**: 新規追加時の判断が容易
- **拡張性**: 将来の動物種追加に対応可能

---

このガイドに従えば、同じミスを繰り返さずに新規自治体を追加できます。
