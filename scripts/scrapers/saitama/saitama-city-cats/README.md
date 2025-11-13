# さいたま市動物愛護ふれあいセンター スクレイパー

## 概要

さいたま市動物愛護ふれあいセンターの譲渡猫情報ページから、猫情報を収集・抽出するスクレイパーです。

## 自治体情報

- **名称**: さいたま市動物愛護ふれあいセンター
- **URL**: https://www.city.saitama.jp/008/004/003/005/jyoutonekonosyoukai.html
- **Municipality ID**: 16
- **データタイプ**: 譲渡動物（adoption）

## 特徴

- **テーブル形式のデータ**: 4列構成のテーブルから情報を抽出
- **詳細な猫情報**: 名前、性別、年齢、毛色、性格を取得
- **複数画像対応**: 各猫につき複数枚の写真を収集
- **動的コンテンツ対応**: Playwrightを使用

## 使用方法

### 1. HTML収集

```bash
node scripts/scrapers/saitama/saitama-city/scrape.js
```

出力先: `data/html/saitama/saitama-city/YYYYMMDD_HHMMSS_tail.html`

### 2. YAML抽出

```bash
node scripts/scrapers/saitama/saitama-city/html-to-yaml.js
```

出力先: `data/yaml/saitama/saitama-city/YYYYMMDD_HHMMSS_tail.yaml`

### 3. データベース投入

```bash
node scripts/yaml-to-db.js
```

## HTMLパース詳細

### テーブル構造

| 列  | 内容     |
| --- | -------- |
| 1   | 名前     |
| 2   | 写真1    |
| 3   | 写真2    |
| 4   | 詳細情報 |

### 詳細情報のフォーマット

4列目の詳細情報は以下の形式で `<br>` 区切り：

```
1 オス/メス
2 年齢
3 毛色、体格
4 性格や特徴の説明文
```

### 抽出フィールド

- `external_id`: saitama-city-{連番}
- `name`: 1列目から取得
- `animal_type`: 固定値 "cat"
- `gender`: "1 オス" → "male", "1 メス" → "female"
- `age_estimate`: "2 " の後の文字列（例: "5歳", "15歳以上"）
- `color`: "3 " の後の文字列（例: "茶白、太め", "キジトラ"）
- `personality`: "4 " の後の文字列（性格の詳細説明）
- `images`: 2列目と3列目からjpg/jpeg画像を収集
- `listing_type`: 固定値 "adoption"（譲渡猫）

### 画像URL構築

相対パスの画像は以下のように絶対URLに変換：

```javascript
const baseUrl = 'https://www.city.saitama.jp/008/004/003/005/';
const fullUrl = href.startsWith('http') ? href : baseUrl + href;
```

## 動作確認

2025-11-12 時点で動作確認済み

- HTML取得: ✅ 正常
- YAML抽出: ✅ 正常（10匹）
- 詳細情報抽出: ✅ 正常
  - 性別: male/female判定正常
  - 年齢: 1歳〜15歳以上まで対応
  - 毛色: 茶白、キジトラ、黒など正常抽出
  - 性格: 詳細な説明文を完全取得

## 注意事項

- テーブルのヘッダー行（名前、写真1、写真2...）はスキップされます
- 4列未満の行は無効データとして除外されます
- 詳細情報は必ず `<br>` で区切られている必要があります
- JavaScript実行が必要なため、Playwrightが必須です
