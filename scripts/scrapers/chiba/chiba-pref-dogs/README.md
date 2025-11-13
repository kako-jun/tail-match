# 千葉県動物愛護センター（犬）

## URL

https://www.pref.chiba.lg.jp/aigo/pet/inu-neko/shuuyou/shuu-inu-tou.html

## 実行方法

```bash
node scripts/scrapers/chiba/chiba-pref-dogs/scrape.js
node scripts/scrapers/chiba/chiba-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（shuu-neko-tou.html）と同じ構造
- `.column2.clearfix` ブロックから抽出
- animal_type: 'dog'
