# 沖縄県動物愛護管理センター（犬）

## URL

https://www.aniwel-pref.okinawa/animals/transfer/dogs

## 実行方法

```bash
node scripts/scrapers/okinawa/okinawa-pref-dogs/scrape.js
node scripts/scrapers/okinawa/okinawa-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（/animals/transfer/cats）と同じ構造
- リンクから抽出
- 「※譲渡しました」で譲渡済み判定
- animal_type: 'dog'
