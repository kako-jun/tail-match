# 名古屋市動物愛護センター スクレイパー

## 概要

- 施設: 名古屋市動物愛護センター「人とペットの共生サポートセンター」
- 運営: 公益社団法人 名古屋市獣医師会
- Municipality ID: `aichi/nagoya-city`
- ページ種別: 犬猫混在（OCR処理必要）

## URL

- リストページ: https://dog-cat-support.nagoya/adoption/

## 特徴

- **画像ベース**: ペット情報が画像内に記載（OCR必要）
- **ステータス画像**: 「飼主さん見つかりました」「相談中」の画像で状態を表示
- **日付ごとグループ化**: 掲載日ごとにペット情報を整理
- **サムネイル画像**: 画像サイズが十分大きくOCR可能

## データ形式

- 画像パス: `../images/adoption/251114/001.jpg`
- 詳細ページ: `251114-001.html`（相対パス）
- ステータス画像: `non.png`（譲渡済み）、`under.png`（相談中）

## 実装方式

### ⚠️ OCR処理が必要

このスクレイパーは**堺市・横浜市と同じOCR方式**を採用しています。

### 実行手順

```bash
# 1. HTMLページ収集
node scripts/scrapers/aichi/nagoya-city/scrape.js

# 2. 画像ダウンロード＆テンプレートYAML生成
node scripts/scrapers/aichi/nagoya-city/extract-from-images.js

# 3. OCR処理（手動 or Claude Vision API）
# data/images/aichi/nagoya-city/ の画像を確認し、情報を抽出

# 4. YAML更新（別途実装が必要）
# node scripts/scrapers/aichi/nagoya-city/update-yaml-from-ocr.js

# 5. DB投入（yaml-to-db.jsに自治体を追加後）
node scripts/core/yaml-to-db.js
```

## OCR処理の流れ

1. **画像ダウンロード**: `extract-from-images.js`で画像を取得
2. **テンプレート生成**: YAMLファイルに空欄テンプレートを作成
3. **情報抽出**: 以下のいずれかで画像から情報を読み取る
   - Claude Vision APIに画像を送信
   - Tesseract.jsなどのOCRライブラリ
   - 手動で画像を確認
4. **YAML更新**: 抽出した情報でYAMLを更新

## 抽出が必要な情報

画像から以下の情報を読み取る必要があります：

- 名前
- 動物種（猫/犬）
- 性別
- 年齢
- 毛色・品種
- 健康状態
- 性格・特徴

## 参考実装

- **堺市**: `scripts/scrapers/osaka/sakai-city-cats/`
- **横浜市**: `scripts/scrapers/kanagawa/yokohama-city-cats/`

## 実装状況

- [x] scrape.js（リストページ収集）
- [x] extract-from-images.js（画像ダウンロード＆テンプレート生成）
- [ ] update-yaml-from-ocr.js（OCR結果でYAML更新）
- [ ] テスト実行
- [ ] DB投入

## 注意事項

- OCR処理には時間がかかる可能性があります
- 画像の品質によっては手動確認が必要です
- ステータス判定（譲渡済み/相談中）は自動で行われます
