# 水戸市動物愛護センター スクレイパー（犬）

## 概要

- 施設: 水戸市動物愛護センター
- Municipality ID: `ibaraki/mito-city-dogs`
- ページ種別: HTML形式（テーブル）
- データ: 犬6匹

## URL

- リストページ: https://www.city.mito.lg.jp/001373/aigo/p025051.html

## 特徴

- **2列レイアウトHTMLテーブル**: 1つのテーブルに複数の動物が2列で並んでいる
- **列インデックス処理**: 同じ列のデータだけを取得する独自ロジック
- **複数の管理番号形式**: `R7-39（名前：ショウ）`、`R7-43（イチロー）` など

## 技術的詳細

猫スクレイパーと同じ2列レイアウトHTMLテーブル処理方式を使用。
詳細は [水戸市動物愛護センター（猫）](../mito-city-cats/README.md) を参照。

### 犬の管理番号形式

- `R7-39（名前：ショウ）` - 「名前：」あり
- `R7-43（イチロー）` - 「名前：」なし

```javascript
const managementMatch = managementText.match(
  /R?(\\d+)-(\\d+)\\s*[（(](?:名前[:：\\s]*)?(.+?)[）)]/
);
const id = managementMatch[2]; // 2番目のグループが番号
const name = managementMatch[3]; // 3番目のグループが名前
```

## データ形式

- 管理番号: `R7-39`
- 名前: 括弧内に記載（「名前：」あり/なし両対応）
- 犬種: 「雑種」「柴犬」等
- 毛色: 「茶」「黒」等
- 性別: 「雌」「雄」
- 年齢: 「約2歳」等
- 性格: 自由記述

## 実行手順

```bash
# HTML収集・YAML生成
node scripts/scrapers/ibaraki/mito-city-dogs/scrape.js
node scripts/scrapers/ibaraki/mito-city-dogs/html-to-yaml.js

# データ整理
node scripts/core/cleanup-html-yaml.js ibaraki mito-city-dogs

# DB投入
node scripts/core/yaml-to-db.js
```

## 関連スクレイパー

- [水戸市動物愛護センター（猫）](../mito-city-cats/README.md) - 同じHTML方式
- [茨城県動物指導センター（犬）](../ibaraki-pref-dogs/README.md) - PDF方式
