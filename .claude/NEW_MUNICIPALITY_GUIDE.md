# 新規自治体追加ガイド（保存版）

**重要**: このガイドは金沢市動物愛護管理センター追加時の失敗から作成されました。必ず最後まで読んでください。

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
   - どのセレクタで猫データが取得できるか
   - 画像、名前、年齢、性別などの取得方法

### Step 2: スクレイパーフォルダ作成

```bash
mkdir -p scripts/scrapers/{prefecture_municipality}
```

例: `scripts/scrapers/kanazawa`

### Step 3: scrape.js 作成

**既存のスクレイパーをコピー**して修正：

```bash
cp scripts/scrapers/ishikawa/scrape.js scripts/scrapers/kanazawa/scrape.js
```

**修正する箇所**:

```javascript
const CONFIG = {
  municipality: 'ishikawa/kanazawa-city', // ⚠️ パス形式で指定
  url: '対象URL',
  expected_selectors: 'セレクタ', // ⚠️ 実際のHTMLに合わせる
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
const CONFIG = {
  municipality: 'ishikawa/kanazawa-city', // ⚠️ パス形式
  base_url: 'https://example.com',
  source_url: '対象URL',
};
```

**⚠️ 重要: YAML出力構造（metaセクション必須）**:

```javascript
// ✅ 正しい構造（metaセクションがある）
const yamlContent = yaml.dump(
  {
    meta: {
      source_file: `${timestamp}_tail.html`,
      source_url: CONFIG.source_url,
      extracted_at: new Date().toISOString(),
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

- 猫が正しく抽出されたか
- 画像URLが空でないか
- 信頼度が HIGH または MEDIUM か

#### 5-3. セレクタ修正

もし猫が0匹抽出された場合：

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
- 発見数: X匹
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

### 問題: 猫が0匹抽出される

**原因**: セレクタが間違っている

**解決方法**:

1. HTMLファイルを直接確認

   ```bash
   grep -A 5 -B 5 "猫の名前" data/html/{prefecture}/{municipality}/*.html
   ```

2. セレクタを緩くする
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

### 実装後

- [ ] HTML収集が成功した（ファイルサイズ確認）
- [ ] YAML抽出が成功した（猫が抽出された）
- [ ] 画像URLが空でない
- [ ] 信頼度が HIGH または MEDIUM
- [ ] README を作成した
- [ ] yaml-to-db.js に追加した

---

## 🎓 学んだ教訓（金沢市追加時）

1. **archiveディレクトリは不要** - HTMLとmetadata.jsonは同じ階層
2. **都道府県階層は必須** - `ishikawa/` を省略してはいけない
3. **municipalityはパス形式** - `'ishikawa/kanazawa-city'` のように指定
4. **セレクタは緩く** - 中間要素（table-wrapperなど）を考慮する
5. **画像はDOM構造を確認** - `.closest()` や `.prev()` の対象を正確に
6. **直接コマンド実行** - ファイル移動などでスクリプトを作らない

---

このガイドに従えば、同じミスを繰り返さずに新規自治体を追加できます。
