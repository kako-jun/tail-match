# 京都府動物愛護管理センター（犬）

## URL

https://kyoto-ani-love.com/recruit-animal/dog/

## 実行方法

```bash
node scripts/scrapers/kyoto/kyoto-pref-dogs/scrape.js
node scripts/scrapers/kyoto/kyoto-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（/recruit-animal/cat/）と同じ構造
- div.content.clearfix から抽出
- animal_type: 'dog'
