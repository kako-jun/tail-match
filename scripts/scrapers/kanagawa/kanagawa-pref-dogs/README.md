# 神奈川県動物愛護センター（犬）

## URL

https://www.pref.kanagawa.jp/osirase/1594/awc/receive/dog.html

## 実行方法

```bash
node scripts/scrapers/kanagawa/kanagawa-pref-dogs/scrape.js
node scripts/scrapers/kanagawa/kanagawa-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（receive/cat.html）と同じ構造
- カード形式から抽出
- animal_type: 'dog'
