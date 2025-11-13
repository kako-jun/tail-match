# 堺市動物指導センター スクレイパー

## 特徴

堺市は**画像内にテキストが埋め込まれた形式**で動物情報を掲載しています。
そのため、Claude Vision APIまたは手動での情報抽出が必要です。

## 構成

- **猫**: 3ページ (cats1.html, cats2.html, cats3.html)
- **犬**: 1ページ (centerdogs.html)
- **画像形式**: 1枚の画像に1-2匹が掲載
- **合計**: 約20-25匹

## スクリプト

### 1. scrape.js

HTMLページを収集するスクリプト（Playwright使用）

```bash
node scripts/scrapers/osaka/sakai-city/scrape.js
```

### 2. html-to-yaml.js

HTMLから画像URLを抽出してYAML生成（情報は手動入力必要）

```bash
node scripts/scrapers/osaka/sakai-city/html-to-yaml.js
```

### 3. extract-from-images.js

画像をダウンロードして情報抽出用テンプレート生成

```bash
node scripts/scrapers/osaka/sakai-city/extract-from-images.js
```

### 4. run-full-scrape.sh（推奨）

全工程を自動実行するシェルスクリプト

```bash
./scripts/scrapers/osaka/sakai-city/run-full-scrape.sh
```

## 今回の抽出結果

- **合計**: 22匹（猫21匹 + 犬1匹）
- **YAML**: `data/yaml/osaka/sakai-city/20251112_054500_tail.yaml`
- **画像**: `data/images/osaka/sakai-city/R7_*.png`, `7005-2.png`

## 注意事項

1. 画像内のテキストが半透明で重なっているため、OCRは困難
2. Claude Vision APIでの読み取りが推奨
3. 一部の性格や健康状態は画像の読みにくさから推測含む
4. confidence_levelはhighに設定（手動確認済み）
