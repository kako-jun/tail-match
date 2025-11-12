# 那覇市環境衛生課 スクレイパー

## 情報

- **URL**: https://www.city.naha.okinawa.jp/kurasitetuduki/animal/904.html
- **Municipality ID**: 22
- **データタイプ**: 譲渡動物（adoption）
- **対象**: 譲渡猫

## 特徴

- **譲渡条件**: 詳細な飼養環境調査あり
- **犬猫両方対応**: 犬と猫の両方を掲載
- **現在の状況**: 譲渡可能な猫はいない

## 使用方法

```bash
node scripts/scrapers/okinawa/naha-city/scrape.js
node scripts/scrapers/okinawa/naha-city/html-to-yaml.js
```

## HTMLパース詳細

### 猫紹介セクション

- セクション: `<div class="h3bg"><div><h3>譲渡猫紹介</h3></div></div>`
- 猫情報: `<div class="img-area-l">` 内
- 画像: `<img src=...>`
- テキスト: `<p>` 内に名前、性別、年齢など

### 抽出フィールド

- 名前: `名前：{名前}`
- 性別: `性別：{性別}`
- 年齢: `推定年齢：{年齢}`
- 特徴: `性格・特徴：{特徴}`
- 画像: 各猫の画像

## 注意事項

- 常時譲渡可能な猫がいるわけではない
- 犬の情報も同じページに掲載されている
- 譲渡には事前登録と講習会受講が必要

## 動作確認

2025-11-12 時点: 0匹の猫（譲渡可能な猫なし）

- 犬: 5匹（ライム、フーガ、マルコ、平次、くるり）
