# 動物愛護施設データベース - サイト構造調査

## 📁 ディレクトリ構成

```
shelters/
├── README.md           # このファイル
├── index.yaml          # メタデータ・サマリー
├── hokkaido.yaml       # 北海道地方
├── tohoku.yaml         # 東北地方
├── kanto.yaml          # 関東地方
├── chubu.yaml          # 中部地方
├── kinki.yaml          # 近畿地方
├── chugoku.yaml        # 中国地方
├── shikoku.yaml        # 四国地方
├── kyushu.yaml         # 九州地方
└── okinawa.yaml        # 沖縄地方
```

## 📊 データベース概要

- **総施設数**: 104施設
- **カバー範囲**: 全国47都道府県
- **施設種別**: 都道府県施設 + 政令指定都市・中核市

## 🔍 サイト構造調査の状況

### 完了項目 ✅

1. **全国施設データの収集完了**
   - 47都道府県、104施設の基本情報を収集
   - URL、電話番号、住所、営業時間など

2. **地方別ファイル分割完了**
   - 10ファイルに分割（北海道〜沖縄）
   - 編集しやすい構造に整理

3. **典型的なサイトパターンの定義**
   - 7パターンを `index.yaml` に定義
   - 難易度、Playwright要否を記録

4. **調査スクリプトの作成**
   - `/scraper/test_site_structure.py` (requests版)
   - `/scraper/playwright_site_investigation.py` (Playwright版)

### 未完了項目 ⏳

1. **実際のサイト構造調査**
   - **現状**: 多くの自治体サイトが403エラーでアクセスブロック
   - **課題**: Playwright必要環境でもブラウザダウンロードが403エラー
   - **対応**: 別環境での実施が必要

2. **scraping_configの作成**
   - 各施設のCSSセレクタ特定
   - ページネーション設定
   - 空状態の検出方法

## 🚧 調査時の技術的制約

### 問題1: 自治体サイトのアクセスブロック (403エラー)

**影響を受けたサイト**:
- 東京都動物愛護相談センター
- 神奈川県動物保護センター
- 大阪府動物愛護管理センター
- 愛知県動物愛護センター
- 福岡県動物愛護センター
- 北海道動物愛護センター
- 宮城県動物愛護センター
- 千葉県動物愛護センター

**試行した対策**:
1. ✅ TailMatchBot User-Agent → ❌ 403エラー
2. ✅ 標準的なChrome User-Agent → ❌ 403エラー
3. ✅ Playwright (実ブラウザ) → ❌ ブラウザダウンロード403エラー

**原因推測**:
- IPアドレスベースのアクセス制限
- WAF (Web Application Firewall) によるボット検出
- 環境全体に対するアクセス制限

### 問題2: Playwrightブラウザのダウンロード失敗

```
Error: Download failed: server returned code 403
URL: https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1187/chromium-linux.zip
```

**影響**: 動的コンテンツ (JavaScript SPA) の調査が不可能

## 🎯 今後の調査方針

### 短期的対応

1. **別環境での調査実施**
   - ローカル開発環境
   - GCE本番環境
   - VPNを使用した調査

2. **手動調査の活用**
   - ブラウザ開発者ツールで構造確認
   - 結果をYAMLに手動記録

3. **サンプル施設の優先調査**
   - 大都市圏の主要施設から開始
   - パターンが類似する施設をグループ化

### 中期的対応

1. **Playwrightスクレイパーの実装**
   - JavaScript SPA対応
   - 動的コンテンツ取得

2. **パターン別スクレイパーの開発**
   - PDFパーサー
   - 静的HTMLテーブル抽出
   - WordPressカード抽出

3. **定期スクレイピングシステムの構築**
   - 2日に1回の全体スクレイピング
   - エラーハンドリングと復旧

## 📝 YAMLファイルの構造

### 各施設のsite_analysis セクション

```yaml
site_analysis:
  investigated: false  # 調査完了フラグ
  investigation_date: null
  html_type: "unknown"  # static | dynamic | hybrid
  javascript_required: null  # Playwright必須か
  notes: "調査待ち"

  scraping_config:
    enabled: false
    list_container: ""  # 猫リストのCSSセレクタ
    item_selector: ""   # 個別猫要素のセレクタ
    wait_for_selector: ""  # JavaScript読み込み待機用

    fields:
      id: ""
      name: ""
      animal_type: ""
      breed: ""
      age: ""
      gender: ""
      color: ""
      size: ""
      protection_date: ""
      deadline_date: ""
      image: ""
      description: ""

    pagination:
      type: "unknown"  # none | numbered | infinite_scroll | button
      selector: ""
      max_pages: null

    empty_state:
      detection_method: ""  # text_pattern | element_absence
      text_pattern: ""
      notes: ""
```

### 調査完了例 (石川県)

```yaml
site_analysis:
  investigated: true
  investigation_date: "2025-07-01"
  html_type: "dynamic"
  javascript_required: true
  notes: "JavaScript SPAで実装 - Playwright必須"

  scraping_config:
    enabled: false
    list_container: ".data_boxes"
    item_selector: ".data_box.cat-card"
    wait_for_selector: ".data_boxes"

    fields:
      id: "dl dt:contains('管理番号') + dd"
      name: "dl dt:contains('名前') + dd"
      # ... 以下略
```

## 🔧 調査用スクリプト

### 1. requests版 (静的HTML用)

```bash
cd /home/user/tail-match/scraper
poetry run python test_site_structure.py
```

**制約**: 403エラーでアクセスできないサイト多数

### 2. Playwright版 (動的コンテンツ用)

```bash
cd /home/user/tail-match/scraper
poetry run playwright install chromium  # 初回のみ
poetry run python playwright_site_investigation.py
```

**制約**: 現環境ではブラウザダウンロード不可

## 📚 参照資料

- **プロジェクト仕様**: `/home/user/tail-match/.claude/CLAUDE.md`
- **既存スクレイパー**: `/home/user/tail-match/scraper/ishikawa_scraper.py`
- **データベーススキーマ**: `/home/user/tail-match/database/init/01-create-tables.sql`

## 🎉 完了した成果

1. ✅ 全国104施設の基本情報データベース作成
2. ✅ 地方別10ファイルへの分割
3. ✅ 典型的なサイトパターンの分類
4. ✅ 調査用スクリプトの実装
5. ✅ scraping_config テンプレートの設計

## 次のステップ

1. **別環境での実調査**: ローカルまたはVPN経由でサイト構造を調査
2. **パターン別実装**: 典型的なパターンごとにスクレイパーを実装
3. **石川県のデバッグ**: Playwright対応で実データ取得を確認
4. **段階的展開**: 調査完了施設から順次スクレイピング開始

---

**最終更新**: 2025-11-07
**ステータス**: サイト構造調査準備完了、実調査は別環境で実施予定
