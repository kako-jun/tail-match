# 沖縄県動物愛護管理センター スクレイパー

## 情報

- **URL**: https://www.aniwel-pref.okinawa/animals/transfer/cats
- **Municipality ID**: 21
- **データタイプ**: 譲渡動物（adoption）
- **対象**: センター譲渡希望猫

## 特徴

- **リンク形式**: 各猫が個別リンクに含まれる
- **画像付き**: 各猫につき1枚の画像
- **譲渡ステータス**: 譲渡済み猫も含まれる

## 使用方法

```bash
node scripts/scrapers/okinawa/okinawa-pref/scrape.js
node scripts/scrapers/okinawa/okinawa-pref/html-to-yaml.js
```

## HTMLパース詳細

### リンク形式

- URL: `/animals/transfer_view/{ID}`
- 名前: `<div class="title"> <p>推進棟　{名前}　※{ステータス}</p>`
- 画像: `<div class="pic"> <img src=...>`
- 日付: `<span class="date">`

### 抽出フィールド

- external_id: URLの数字部分
- 名前: 「推進棟」と「※」以降を除去
- status: 「※譲渡しました」でadopted判定
- special_needs: 「※環境調査中」などの備考
- 画像: 1枚

## 注意事項

- 「推進棟」という接頭辞が付いている
- 譲渡済みの猫も掲載されている（status: adopted）
- 環境調査中の猫も含まれる

## 動作確認

2025-11-12 時点: 13匹の猫を正常抽出

- 譲渡可能: 11匹
- 譲渡済み: 2匹（アルン、ツバキ）
- ポー、つきみ、だんご、すすき、あやめ、サザンカ、まりも、うめ、ぼんてん、みらん（環境調査中）、ぽわ
