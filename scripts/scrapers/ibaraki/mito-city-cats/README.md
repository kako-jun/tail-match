# 水戸市動物愛護センター スクレイパー（猫）

## 概要

- 施設: 水戸市動物愛護センター
- Municipality ID: `ibaraki/mito-city-cats`
- ページ種別: HTML形式（テーブル）
- データ: 猫3匹

## URL

- リストページ: https://www.city.mito.lg.jp/001373/aigo/p025064.html

## 特徴

- **2列レイアウトHTMLテーブル**: 1つのテーブルに複数の動物が2列で並んでいる
- **列インデックス処理**: 同じ列のデータだけを取得する独自ロジック
- **複数の管理番号形式**: `譲渡猫34`、`譲渡猫 R-43` など

## 技術的詳細

### 問題: 2列レイアウトテーブルの処理

1つのテーブルに複数の動物が2列で並んでいる。単純に`th:contains(\"管理番号\")`で取得すると、同じテーブル内の別の列のデータを誤って取得してしまう。

### 解決策: 列インデックスを使用

```javascript
// 各管理番号セルに対して処理
$managementCells.each((j, th) => {
  const $th = $(th);
  const $row = $th.parent();
  const thIndex = $row.find('th').index($th); // 列インデックスを取得

  // 同じ列のデータを取得する関数
  const getFieldValue = (fieldName) => {
    const $fieldRow = $table.find(`th:contains(\"${fieldName}\")`).parent();
    const $tds = $fieldRow.find('td');

    if (thIndex === 0) {
      return $tds.first().text().trim(); // 左列
    } else {
      return $tds.last().text().trim(); // 右列
    }
  };

  const color = getFieldValue('毛色');
  const genderText = getFieldValue('性別');
  // ...
});
```

### 複数の管理番号形式への対応

- `譲渡猫34（名前：しー）` - 基本形式
- `譲渡猫 R-43（名前：マル）` - R-付き形式

```javascript
const managementMatch = managementText.match(
  /譲渡猫\\s*(?:R-)?(\\d+)\\s*[（(]名前[:：\\s]*(.+?)[）)]/
);
```

## データ形式

- 管理番号: `譲渡猫34`、`譲渡猫 R-43`
- 名前: 括弧内に記載
- 毛色: 「茶トラ」「キジトラ」等
- 性別: 「雌」「雄」
- 年齢: 「約2歳」等
- 性格: 自由記述

## 実行手順

```bash
# HTML収集・YAML生成
node scripts/scrapers/ibaraki/mito-city-cats/scrape.js
node scripts/scrapers/ibaraki/mito-city-cats/html-to-yaml.js

# データ整理
node scripts/core/cleanup-html-yaml.js ibaraki mito-city-cats

# DB投入
node scripts/core/yaml-to-db.js
```

## 関連スクレイパー

- [水戸市動物愛護センター（犬）](../mito-city-dogs/README.md) - 同じHTML方式
- [茨城県動物指導センター（猫）](../ibaraki-pref-cats/README.md) - PDF方式
