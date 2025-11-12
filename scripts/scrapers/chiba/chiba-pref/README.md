# 千葉県動物愛護センター スクレイパー

## 情報

- **URL**: https://www.pref.chiba.lg.jp/aigo/pet/inu-neko/shuuyou/shuu-neko-tou.html
- **Municipality ID**: 17
- **データタイプ**: 収容動物（lost_pet）
- **対象**: 東葛飾支所の収容猫

## 使用方法

```bash
node scripts/scrapers/chiba/chiba-pref/scrape.js
node scripts/scrapers/chiba/chiba-pref/html-to-yaml.js
```

## 動作確認

2025-11-12 時点: 収容猫0匹（空状態処理正常）
