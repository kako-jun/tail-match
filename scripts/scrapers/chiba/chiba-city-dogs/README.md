# 千葉市動物保護指導センター（犬）

## URL

https://www.city.chiba.jp/hokenfukushi/iryoeisei/seikatsueisei/dobutsuhogo/transferdogs.html

## 実行方法

```bash
# HTML収集
node scripts/scrapers/chiba/chiba-city-dogs/scrape.js

# YAML抽出
node scripts/scrapers/chiba/chiba-city-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（transfercats.html）と同じ構造
- Playwright使用（動的コンテンツ対応）
- animal_type: 'dog' で犬情報を抽出
