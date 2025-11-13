# 千葉市動物保護指導センター スクレイパー

## 情報

- **URL**: https://www.city.chiba.jp/hokenfukushi/iryoeisei/seikatsueisei/dobutsuhogo/transfercats.html
- **Municipality ID**: 18
- **データタイプ**: 譲渡動物（adoption）
- **対象**: 新しい飼い主を待っている猫

## 特徴

- H4タグで管理番号と名前を抽出
- 詳細情報（性別、年齢、毛色、性格）を正規表現で解析
- ペテモライフハウス連携猫も含む

## 使用方法

```bash
node scripts/scrapers/chiba/chiba-city/scrape.js
node scripts/scrapers/chiba/chiba-city/html-to-yaml.js
```

## 動作確認

2025-11-12 時点: 15匹の猫を正常抽出
