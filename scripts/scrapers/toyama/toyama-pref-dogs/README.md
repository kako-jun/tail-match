# 富山県動物管理センター（犬）

## URL

https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/dog.html

## 実行方法

```bash
node scripts/scrapers/toyama/toyama-pref-dogs/scrape.js
node scripts/scrapers/toyama/toyama-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（cat.html）と同じ構造
- div.col2L, div.col2R から抽出
- animal_type: 'dog'
