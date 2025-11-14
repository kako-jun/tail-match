# 愛知県動物愛護センター 犬スクレイパー

## 概要

- 施設: 愛知県動物愛護センター（本所・尾張支所）
- Municipality ID: `aichi/aichi-pref-dogs`
- ページ種別: 犬専用（2支所統合、知多支所は犬用ページなし）

## URL

- 本所: https://www.pref.aichi.jp/soshiki/doukan-c/honsyoinu.html
- 尾張支所: https://www.pref.aichi.jp/soshiki/doukan-c/owariinu.html
- 知多支所: なし（404エラー）

## HTML構造

- テーブル形式（2列: 写真 | 特徴）
- 管理No.で各犬を識別
- 性別・年齢・品種などの情報あり
- 静的HTML（JavaScript不要だが、Playwright使用）

## 実行方法

```bash
# 1. HTML収集（2支所統合）
node scripts/scrapers/aichi/aichi-pref-dogs/scrape.js

# 2. YAML抽出
node scripts/scrapers/aichi/aichi-pref-dogs/html-to-yaml.js

# 3. DB投入（yaml-to-db.jsに自治体を追加後）
node scripts/core/yaml-to-db.js
```

## データ形式

- external_id: `aichi-{branch}-{管理No}`（例: `aichi-honjo-26`）
- 名前: なし（yaml-to-db.jsでデフォルト名生成）
- 性別: オス/メス
- 年齢: 推定年齢
- 品種: 雑種・柴犬など

## 実装状況

- [x] scrape.js（2支所統合HTML収集）
- [x] html-to-yaml.js（YAML抽出）
- [ ] テスト実行
- [ ] DB投入
