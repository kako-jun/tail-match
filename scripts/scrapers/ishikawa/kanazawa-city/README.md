# 金沢市動物愛護管理センター スクレイパー

## 概要

金沢市動物愛護管理センターの猫譲渡情報をスクレイピングします。

- **URL**: https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/7301.html
- **Municipality ID**: `kanazawa-city`
- **対象動物**: 猫
- **HTML構造**: 静的HTML（Playwright使用）

## HTML構造の特徴

金沢市のサイトは以下の構造：

```html
<figure class="img-item">
  <img alt="..." src="..." />
</figure>
<div class="wysiwyg">
  <table>
    <caption>
      <p>動物番号：C070327</p>
    </caption>
    <thead>
      <tr>
        <th>種類</th>
        <th>毛色</th>
        <th>性別</th>
        <th>推定年齢</th>
        <th>体格</th>
      </tr>
      <tr>
        <td>雑種</td>
        <td>キジトラ</td>
        <td>メス</td>
        <td>15歳</td>
        <td>中</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>その他</th>
        <td colspan="5">詳細情報...名前は『みたらし』ちゃん...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### データ抽出ポイント

- **動物番号**: `table caption p` から抽出（例：C070327）
- **特徴**: `thead tr:nth-child(2) td` から種類、毛色、性別、推定年齢、体格
- **名前**: `tbody tr td` の詳細情報から『』で囲まれた部分を抽出
- **画像**: 直前の `figure.img-item img` から取得（相対パスに `https:` を追加）

## 実行方法

### 1. HTML収集（Playwright）

```bash
node scripts/scrapers/kanazawa/scrape.js
```

**出力**: `data/html/kanazawa-city/archive/YYYYMMDD_HHMMSS_tail.html`

### 2. YAML抽出

```bash
node scripts/scrapers/kanazawa/html-to-yaml.js
```

**出力**: `data/yaml/kanazawa-city/YYYYMMDD_HHMMSS_tail.yaml`

### 3. DB投入

```bash
# DRY-RUN で確認
node scripts/yaml-to-db.js --dry-run

# 実際に投入
node scripts/yaml-to-db.js
```

## ファイル構造

```
data/
├── html/
│   └── kanazawa-city/
│       ├── archive/
│       │   └── 20251112_143000_tail.html
│       └── latest_metadata.json
└── yaml/
    └── kanazawa-city/
        └── 20251112_143000_tail.yaml
```

## 実績データ（2025-11-12）

- **取得サイズ**: 44KB
- **発見数**: 2匹（みたらし、キング）
- **信頼度**: HIGH
- **JavaScript必要性**: 不要（静的HTML）

## 注意事項

- 画像URLは相対パス（`//www4.city.kanazawa.lg.jp/...`）なので、`https:` を追加する必要があります
- 名前は「その他」欄の『』で囲まれた部分から抽出します
- テーブル1つ = 猫1匹の対応関係
