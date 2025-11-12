# 福井県動物愛護管理センター スクレイパー

## 基本情報

- **自治体**: 福井県動物愛護管理センター
- **URL**: https://www.fapscsite.com/adoptable_animal/animal_kind/cat/
- **JavaScript必須**: Yes
- **外部サイト**: fapscsite.com（福井県の公式サイトではない）

## HTML構造の特徴

### article要素ベース

```html
<article id="post-{id}" class="animal-item">
  <header class="entry-header">
    <span class="adoptable-label matching">新しい飼い主を募集中</span>
    <div class="animal-slideshow">
      <ul class="uk-slideshow-items">
        <li><img src="..." /></li>
      </ul>
    </div>
    <h2 class="entry-title">管理番号：HC25378.25379(松岡上吉野)</h2>
  </header>
  <div class="entry-content">
    <dl class="spec dl-table-row">
      <dt>品種</dt>
      <dd>雑種</dd>
      <dt>性別</dt>
      <dd>オス：1匹、メス：1匹</dd>
      <dt>年齢</dt>
      <dd>2025年春生まれ</dd>
      <dt>体格</dt>
      <dd>小型・中型</dd>
      <dt>毛種／毛色</dt>
      <dd>短毛／三毛、グレー</dd>
      <dt>その他</dt>
      <dd>...</dd>
      <dt>収容場所</dt>
      <dd>本所</dd>
    </dl>
  </div>
</article>
```

### 複数動物対応

1つのarticleに複数の猫が含まれる場合があります：

- **管理番号**: `HC25378.25379` → 2匹の猫（HC25378とHC25379）
- **性別**: `オス：1匹、メス：1匹` → オス1匹、メス1匹

html-to-yaml.jsは自動的に複数の猫を分離して抽出します。

### データフィールド

- **品種**: 雑種、アメリカンショートヘアなど
- **性別**: オス/メス（複数の場合は匹数も記載）
- **年齢**: 「2025年春生まれ」など自然言語表現
- **体格**: 小型、中型、大型
- **毛種／毛色**: 短毛、長毛、色情報
- **その他**: 健康状態、ワクチン情報など
- **収容場所**: 本所、支所など

## 実行方法

### Step 1: HTML収集

```bash
node scripts/scrapers/fukui/fukui-pref/scrape.js
```

- 出力先: `data/html/fukui/fukui-pref/YYYYMMDD_HHMMSS_tail.html`

### Step 2: YAML抽出

```bash
node scripts/scrapers/fukui/fukui-pref/html-to-yaml.js
```

- 出力先: `data/yaml/fukui/fukui-pref/YYYYMMDD_HHMMSS_tail.yaml`

### Step 3: DB投入（DRY-RUN）

```bash
node scripts/yaml-to-db.js --dry-run
```

### Step 4: DB投入（本番）

```bash
node scripts/yaml-to-db.js
```

## 実績データ

### 初回実行

- **実行日**: 2025-11-12
- **発見数**: 25匹（12記事）
- **信頼度**: HIGH
- **HTML サイズ**: 93,079 bytes
- **YAML サイズ**: 19,395 bytes
- **DB投入**: 成功（25匹全て投入完了）
- **名前自動生成**: 25匹全て（例: 保護動物25378号）

## 抽出ロジックの特徴

### 1. 複数動物の分離

管理番号が `HC25378.25379` のように複数ある場合、自動的に分離：

```javascript
parseManagementNumbers('管理番号：HC25378.25379(松岡上吉野)');
// → ["HC25378", "HC25379"]
```

### 2. 性別情報の解析

性別が `オス：1匹、メス：1匹` のように複数匹数表記の場合、自動的に展開：

```javascript
parseGenderString('オス：1匹、メス：1匹');
// → [{gender: 'male', index: 0}, {gender: 'female', index: 0}]
```

### 3. 名前情報の扱い

福井県のサイトには個体名情報がないため、`name: null` で出力されます。
DB投入時に `yaml-to-db.js` の `generateDefaultName()` 関数により、自動的に「保護猫○号」が生成されます。

### 4. 画像抽出

スライドショー形式の画像を全て抽出：

```javascript
$article.find('.uk-slideshow-items img').each((i, img) => {
  const src = $(img).attr('src');
  images.push(src);
});
```

## トラブルシューティング

### 猫が0匹抽出される

**原因**: セレクタが間違っている、またはJavaScriptレンダリング未完了

**解決方法**:

```bash
# HTMLで実際の構造を確認
grep -n "article" data/html/fukui/fukui-pref/*.html | head
```

### 画像URLが空

**原因**: スライドショー構造の把握が不正確

**解決方法**: `.uk-slideshow-items img` セレクタを確認

### 複数動物の分離が不正確

**原因**: 管理番号や性別のパターンが想定外

**解決方法**: `parseManagementNumbers()` と `parseGenderString()` の正規表現を調整

## 注意点

- 外部サイト（fapscsite.com）であるため、サイト構造変更の可能性
- 複数動物が1つのarticleに含まれるため、抽出ロジックが複雑
- 名前情報がないため、DB投入時に自動生成される
