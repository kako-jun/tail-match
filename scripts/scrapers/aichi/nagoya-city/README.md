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

### ⚠️ OCR処理が必要（完全自動化不可）

このスクレイパーは**堺市・横浜市と同じOCR方式**を採用しています。

**重要**: このスクレイパーは通常の全国一括実行では**完結しません**。

### 実行手順

#### 自動実行部分（全国スクレイパー実行に含まれる）

```bash
# 1. HTMLページ収集
node scripts/scrapers/aichi/nagoya-city/scrape.js

# 2. 画像ダウンロード＆テンプレートYAML生成
node scripts/scrapers/aichi/nagoya-city/extract-from-images.js
```

この時点で：

- ✅ 猫のリストは取得済み（123匹など）
- ✅ 画像は全てダウンロード済み
- ❌ 詳細データ（年齢、性別、毛色など）は**null**

#### 手動実行部分（別途実施が必要）

```bash
# 3. 画像を目視確認し、extractedData を更新
# update-yaml-from-images.js の extractedData オブジェクトに
# 画像から読み取った情報を追加

# 4. YAML更新
node scripts/scrapers/aichi/nagoya-city/update-yaml-from-images.js

# 5. DB投入
node scripts/core/yaml-to-db.js
```

### OCR自動化（推奨）

`ocr-extract.js` スクリプトで **Google Cloud Vision API** を使った完全自動化が可能です：

#### メリット

- ✅ **月1,000リクエストまで無料**
- ✅ OCR専用なので精度が高い
- ✅ 名古屋市123枚は完全に無料枠内

#### セットアップ手順

```bash
# 1. Google Cloud Vision APIを有効化
# https://console.cloud.google.com/ でプロジェクト作成
# Vision API を有効化

# 2. サービスアカウント作成 → キーをダウンロード
# IAMと管理 → サービスアカウント → キーを作成 → JSON

# 3. 環境変数を設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# 4. パッケージインストール
npm install @google-cloud/vision

# 5. OCR実行
node scripts/scrapers/aichi/nagoya-city/ocr-extract.js

# 6. 抽出データで YAML 更新
# ocr-extract.js が data/ocr/aichi/nagoya-city/extracted_data.json を生成
# このJSONを update-yaml-from-images.js の extractedData に反映

# 7. YAML更新
node scripts/scrapers/aichi/nagoya-city/update-yaml-from-images.js
```

#### 無料枠の計算

- 名古屋市: 123リクエスト/月
- 堺市: ~50リクエスト/月
- 横浜市: ~10リクエスト/月
- **合計**: ~200リクエスト/月 → **完全に無料枠内**

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
