# 福井県動物愛護管理センター（犬）

## URL

https://www.fapscsite.com/adoptable_animal/animal_kind/dog/

## 実行方法

```bash
node scripts/scrapers/fukui/fukui-pref-dogs/scrape.js
node scripts/scrapers/fukui/fukui-pref-dogs/html-to-yaml.js
```

## 特徴

- 猫用ページ（/animal_kind/cat/）と同じ構造
- article.animal-item から抽出
- 1つのarticleに複数の犬が含まれる可能性あり
- animal_type: 'dog'
