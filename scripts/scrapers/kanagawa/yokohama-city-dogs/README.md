# 横浜市動物愛護センター スクレイピング

## 概要

横浜市動物愛護センターは、画像ベースの情報提供サイトです。画像から詳細情報（年齢、性別、性格など）を抽出する必要があります。

## サイト特徴

- **URL**: https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/jotoinfo-cat.html
- **形式**: 静的HTML + 画像ベースの情報提供
- **ページネーション**: なし
- **データ構造**: 画像内に猫の詳細情報が含まれる

## スクレイピング手順

### 初回実行

```bash
# 1. HTMLを取得
node scripts/scrapers/kanagawa/yokohama-city/scrape.js

# 2. 画像をダウンロード
node scripts/scrapers/kanagawa/yokohama-city/extract-from-images.js

# 3. 画像から情報を抽出してYAML更新
node scripts/scrapers/kanagawa/yokohama-city/update-yaml-from-images.js

# 4. データベースに投入
node scripts/yaml-to-db.js
```

### 2回目以降の実行

```bash
# 1. HTMLを取得（新しいタイムスタンプで保存）
node scripts/scrapers/kanagawa/yokohama-city/scrape.js

# 2. 画像をダウンロード（新しい画像があればダウンロード）
node scripts/scrapers/kanagawa/yokohama-city/extract-from-images.js

# 3. 画像から情報を抽出
# NOTE: update-yaml-from-images.js の extractedData を必要に応じて更新
node scripts/scrapers/kanagawa/yokohama-city/update-yaml-from-images.js

# 4. データベースに投入
node scripts/yaml-to-db.js
```

## スクリプト説明

### `scrape.js`

- Playwrightで静的HTMLページを取得
- タイムスタンプ付きでHTMLファイルを保存

### `html-to-yaml.js`

- HTMLから画像URLとお問合せ番号を抽出
- 基本情報のみのYAMLファイルを生成（詳細情報は画像から抽出が必要）

### `extract-from-images.js`

- HTMLから画像URLを抽出
- 各猫の画像をダウンロード
- 画像パスを含むYAMLテンプレートを生成

### `update-yaml-from-images.js`

- ダウンロードした画像から情報を抽出
- YAMLファイルを完全な情報で更新
- 年齢、性別、性格、健康状態などを追加

## データ抽出内容

画像から抽出される情報：

- お問合せ番号
- 推定年齢（例: 推定12歳）
- 性別（オス/メス）
- 品種・毛色
- 健康状態（去勢手術済み、ワクチン接種済みなど）
- 性格（人懐っこい、甘えん坊など）
- 特別な配慮事項

## 注意事項

### 画像情報の更新

`update-yaml-from-images.js` の `extractedData` オブジェクトは、画像から抽出した情報を手動で定義しています。新しい猫が追加された場合は、このオブジェクトに新しいエントリを追加する必要があります。

```javascript
const extractedData = {
  134: {
    age_estimate: '推定12歳',
    gender: 'male',
    breed: 'キジトラ',
    // ...
  },
  // 新しい猫を追加
};
```

### 画像の保存先

画像は `data/images/kanagawa/yokohama-city/` に保存されます。

### YAMLファイルの管理

- `_tail.yaml`: 基本情報のみ（画像URL、お問合せ番号）
- `_with_images.yaml`: 画像ダウンロード後のテンプレート
- `{timestamp}_tail.yaml`: 完全な情報を含む最終YAML

## トラブルシューティング

### 画像のダウンロードに失敗する

- ネットワーク接続を確認
- 画像URLが変更されていないか確認
- `scrape.js` を再実行してHTMLを再取得

### 性別や年齢が正しく抽出されない

- `update-yaml-from-images.js` の `extractedData` を確認
- 画像の内容と一致しているか確認
- 必要に応じて手動で修正

## 参考リンク

- [横浜市動物愛護センター公式サイト](https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/)
- [譲渡動物情報（猫）](https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/joto/jotoinfo-cat.html)
