# 茨城県動物指導センター スクレイパー（犬）

## 概要

- 施設: 茨城県動物指導センター
- Municipality ID: `ibaraki/ibaraki-pref-dogs`
- ページ種別: PDF形式
- データ: 犬165匹（11ページ）

## URL

- PDFファイル: https://www.pref.ibaraki.jp/hokenfukushi/doshise/hogo/documents/inu1113.pdf

## 特徴

- **2列レイアウトPDF**: 左列と右列に別々の動物データが記載
- **複数ページ**: 11ページにわたる大量データ
- **PDF.js使用**: pdfjs-dist パッケージで PDF を解析
- **x座標ベース分離**: 列境界（x=500）で左列・右列を完全分離

## 技術的詳細

猫スクレイパーと同じ2列レイアウトPDF処理方式を使用。
詳細は [茨城県動物指導センター（猫）](../ibaraki-pref-cats/README.md) を参照。

## データ形式

- 管理番号: `No.16-001`
- 犬種: 「雑種」「柴犬」等
- 毛色: 「茶」「黒」等
- 性別: 「雌」「雄」
- 年齢: 「2歳くらい」「1歳くらい」
- 健康状態: 「良好」等
- 性格: 自由記述

## 実行手順

```bash
# PDF収集・解析・YAML生成
node scripts/scrapers/ibaraki/ibaraki-pref-dogs/scrape.js
node scripts/scrapers/ibaraki/ibaraki-pref-dogs/html-to-yaml.js

# データ整理
node scripts/core/cleanup-html-yaml.js ibaraki ibaraki-pref-dogs

# DB投入
node scripts/core/yaml-to-db.js
```

## 関連スクレイパー

- [茨城県動物指導センター（猫）](../ibaraki-pref-cats/README.md) - 同じPDF方式
- [水戸市動物愛護センター（犬）](../mito-city-dogs/README.md) - HTML方式
