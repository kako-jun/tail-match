# 神奈川県動物愛護センター スクレイピング

## 概要

神奈川県動物愛護センターは、Vue.jsで動的にレンダリングされるページネーション付きサイトです。

## サイト特徴

- **URL**: https://www.pref.kanagawa.jp/osirase/1594/awc/receive/cat.html
- **形式**: Vue.js動的レンダリング
- **ページネーション**: あり（クライアントサイド）
- **データ構造**: カード形式、テーブル構造

## スクレイピング手順

### 初回実行

```bash
# 1. HTMLを取得（全ページ自動収集）
node scripts/scrapers/kanagawa/kanagawa-pref/scrape.js

# 2. YAMLに抽出
node scripts/scrapers/kanagawa/kanagawa-pref/html-to-yaml.js

# 3. データベースに投入
node scripts/yaml-to-db.js
```

### 2回目以降の実行

```bash
# 1. HTMLを取得（新しいタイムスタンプで保存）
node scripts/scrapers/kanagawa/kanagawa-pref/scrape.js

# 2. YAMLに抽出
node scripts/scrapers/kanagawa/kanagawa-pref/html-to-yaml.js

# 3. データベースに投入
node scripts/yaml-to-db.js
```

## スクリプト説明

### `scrape.js`

- Playwrightでページを取得
- ページネーションボタンをクリックして全ページを収集
- コンテンツ変化検出により最終ページを自動判定
- 各ページを個別のHTMLファイルとして保存（page1.html, page2.html, ...）

**ページネーションロジック:**

1. 「次のページ」ボタンをクリック
2. ページ読み込みを待つ（3秒）
3. 最初のカードのテキストを比較して、コンテンツが変わったか確認
4. 同じコンテンツなら最終ページと判定
5. 異なるコンテンツなら次のページへ

### `html-to-yaml.js`

- 複数のHTMLファイルを読み込み
- 各ファイルからカード情報を抽出
- 全ページの猫情報を1つのYAMLファイルにまとめる

**抽出情報:**

- 仮名（猫の名前）
- 年齢（収容時）
- 性別
- 種別（品種）
- 毛色
- 体格（サイズ）
- 性格
- 備考
- 収容時期（日付推定）

## データ構造

### HTMLカード構造

```html
<div class="column is-one-quarter-desktop">
  <div class="card-image">
    <img src="..." alt="..." />
  </div>
  <table>
    <tr>
      <th>仮名</th>
      <td>コロンボ</td>
    </tr>
    <tr>
      <th>年齢（収容時）</th>
      <td>推定4歳</td>
    </tr>
    <tr>
      <th>性別</th>
      <td>オス</td>
    </tr>
    <!-- ... -->
  </table>
</div>
```

## 技術的詳細

### ページネーション検出

`scrape.js` では、以下のロジックでページネーションを処理します：

1. **最初のカードテキスト比較**: `previousFirstCardText` と現在の `firstCardText` を比較
2. **同じテキストなら終了**: 同じページを繰り返しているため、最終ページと判定
3. **異なるテキストなら継続**: 新しいコンテンツがあるため、次のページへ

この方法により、ページ数が変動しても自動的に対応できます。

### マルチページHTMLファイル

- `20251112_070309_tail_page1.html`
- `20251112_070309_tail_page2.html`
- `20251112_070309_tail_page3.html`
- `20251112_070309_tail_page4.html`

各ページが個別のファイルとして保存されます。

### YAML統合

`html-to-yaml.js` は、`getLatestHtmlFiles()` で最新のタイムスタンプのページファイルをすべて取得し、全ページから抽出した猫情報を1つのYAMLファイルにまとめます。

## 注意事項

### ページネーション上限

安全のため、`scrape.js` では最大10ページまでの制限があります。それ以上のページがある場合は、コードを修正してください。

```javascript
// 安全のための上限
if (currentPage > 10) {
  console.log('   ⚠️ ページ数上限到達');
  break;
}
```

### 収容時期の日付変換

`parseProtectionDate()` 関数は、「2025年10月」形式を「2025-10-01」に変換します。日付の精度は月単位です。

### external_id生成

猫の `external_id` は、仮名がある場合は `kanagawa-{仮名}` 形式、ない場合は `kanagawa-unknown-{index}` 形式で生成されます。

## トラブルシューティング

### ページネーションが無限ループする

- コンテンツ変化検出ロジックを確認
- `scrape.js` の `previousFirstCardText` 比較部分をデバッグ

### ページ数が期待より少ない

- ページ読み込み時間を増やす（`page.waitForTimeout(3000)` → `5000`）
- ネットワークが遅い場合、Vue.jsのレンダリングに時間がかかる可能性

### 画像URLが取得できない

- 画像URLは相対パスで保存されるため、`CONFIG.base_url` と結合する必要があります
- `html-to-yaml.js` の `extractCatFromCard()` 関数を確認

## 参考リンク

- [神奈川県動物愛護センター公式サイト](https://www.pref.kanagawa.jp/docs/v7t/cnt/f80192/)
- [譲渡動物情報（猫）](https://www.pref.kanagawa.jp/osirase/1594/awc/receive/cat.html)
