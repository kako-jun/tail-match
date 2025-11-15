# 茨城県動物指導センター スクレイパー（猫）

## 概要

- 施設: 茨城県動物指導センター
- Municipality ID: `ibaraki/ibaraki-pref-cats`
- ページ種別: PDF形式
- データ: 猫16匹

## URL

- PDFファイル: https://www.pref.ibaraki.jp/hokenfukushi/doshise/hogo/documents/neko1113.pdf

## 特徴

- **2列レイアウトPDF**: 左列と右列に別々の動物データが記載
- **PDF.js使用**: pdfjs-dist パッケージで PDF を解析
- **x座標ベース分離**: 列境界（x=500）で左列・右列を完全分離

## 技術的詳細

### 問題: 2列レイアウトの処理

PDFが2列レイアウトで、左列と右列を別の行として出力すると動物データの対応関係が崩れる。

### 解決策: x座標ベースで完全分離

```javascript
async function extractPDFText(pdfPath) {
  const COLUMN_BOUNDARY = 500; // x座標の境界

  let leftText = '';
  let rightText = '';

  const leftLines = {};
  const rightLines = {};

  for (const item of textContent.items) {
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];

    if (x < COLUMN_BOUNDARY) {
      if (!leftLines[y]) leftLines[y] = [];
      leftLines[y].push({ text: item.str, x: x });
    } else {
      if (!rightLines[y]) rightLines[y] = [];
      rightLines[y].push({ text: item.str, x: x });
    }
  }

  // 左列と右列を別々に処理してから結合
  return leftText + '\n\n' + rightText;
}
```

### パース戦略

1. 全管理番号を先に収集（`animalIndices`配列）
2. 各管理番号について、次の管理番号までの範囲のデータを抽出
3. これにより2列の動物が正しく分離される

## データ形式

- 管理番号: `No.16-001`
- 毛色: 「茶トラ」「キジトラ」等
- 性別: 「雌」「雄」
- 年齢: 「2歳くらい」「1歳くらい」
- 健康状態: 「良好」等
- 性格: 自由記述

## 実行手順

```bash
# PDF収集・解析・YAML生成
node scripts/scrapers/ibaraki/ibaraki-pref-cats/scrape.js
node scripts/scrapers/ibaraki/ibaraki-pref-cats/html-to-yaml.js

# データ整理
node scripts/core/cleanup-html-yaml.js ibaraki ibaraki-pref-cats

# DB投入
node scripts/core/yaml-to-db.js
```

## 関連スクレイパー

- [茨城県動物指導センター（犬）](../ibaraki-pref-dogs/README.md) - 同じPDF方式
- [水戸市動物愛護センター（猫）](../mito-city-cats/README.md) - HTML方式
