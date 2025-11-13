# 埼玉県動物指導センター スクレイパー

## 概要

埼玉県動物指導センターの収容動物情報ページから、猫情報を収集・抽出するスクレイパーです。

## 自治体情報

- **名称**: 埼玉県動物指導センター
- **URL**: https://www.pref.saitama.lg.jp/b0716/shuuyou-jyouhou-pocg.html
- **Municipality ID**: 15
- **データタイプ**: 収容動物（lost_pet）

## 特徴

- **動的コンテンツ対応**: Playwrightを使用してJavaScript実行後のHTMLを取得
- **空状態対応**: 収容動物がいない場合も適切に処理
- **待機時間**: 5秒間のJavaScript実行待機

## 使用方法

### 1. HTML収集

```bash
node scripts/scrapers/saitama/saitama-pref/scrape.js
```

出力先: `data/html/saitama/saitama-pref/YYYYMMDD_HHMMSS_tail.html`

### 2. YAML抽出

```bash
node scripts/scrapers/saitama/saitama-pref/html-to-yaml.js
```

出力先: `data/yaml/saitama/saitama-pref/YYYYMMDD_HHMMSS_tail.yaml`

### 3. データベース投入

```bash
node scripts/yaml-to-db.js
```

## HTMLパース詳細

### データ構造

ページ構造：

- 新着情報セクションに収容動物情報が表示される
- 収容動物がいない場合は「現在、新着情報はありません」と表示される

### 抽出フィールド

- `external_id`: スクレイパーで生成（saitama-pref-{連番}）
- `animal_type`: 固定値 "cat"
- `listing_type`: 固定値 "lost_pet"（収容動物）
- その他の詳細情報は実際のHTML構造に依存

## 注意事項

- 現在収容されている猫がいない場合、0件のYAMLファイルが生成されます
- JavaScript実行が必要なため、Playwrightが必須です
- ページ構造が変更された場合、パース処理の修正が必要になる可能性があります

## 動作確認

2025-11-12 時点で動作確認済み

- HTML取得: ✅ 正常
- YAML抽出: ✅ 正常（0件）
- 空状態処理: ✅ 正常
