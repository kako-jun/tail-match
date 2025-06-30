# Tail Match - 保護猫マッチングサービス 仕様書

## プロジェクト概要

**ミッション**: 日本全国の自治体保護猫情報を集約し、殺処分を防ぐためのマッチングサービス

**背景**: 
- 日本には多数の保護猫が存在し、期限内に引き取り手が見つからなければ殺処分される
- 各自治体のサイトは統一性がなく、他県の情報をチェックする人は少ない
- 民間団体や個人では横断的な情報収集が困難

**解決策**: AIを活用した自動スクレイピング + 使いやすい検索・マッチングUI

---

## 技術スタック

### フロントエンド
- **Next.js 15** - React 19 + TypeScript
- **Tailwind CSS** - モバイルファーストのレスポンシブデザイン
- **Lucide React** - アイコン
- **明るい色合い** - 陰鬱な印象を避ける

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **PostgreSQL** - メインデータベース
- **Python** - スクレイピングシステム
- **Docker Compose** - 開発・本番環境

### インフラ
- **GCE (Google Compute Engine)** - ホスティング
- **GitHub Actions** - CI/CD
- **Cron** - 定期スクレイピング実行

---

## データベース設計

### 1. regions (地域区分)
```sql
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    code CHAR(2) NOT NULL UNIQUE,
    type VARCHAR(20) DEFAULT 'prefecture',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. municipalities (自治体)
```sql
CREATE TABLE municipalities (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    name VARCHAR(100) NOT NULL,
    municipality_type VARCHAR(20),
    website_url VARCHAR(500),
    contact_info JSONB,
    scraping_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. tails (動物情報)
```sql
CREATE TABLE tails (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    external_id VARCHAR(100),
    animal_type VARCHAR(20) DEFAULT 'cat',
    name VARCHAR(100),
    breed VARCHAR(100),
    age_estimate VARCHAR(50),
    gender VARCHAR(10),
    color VARCHAR(100),
    size VARCHAR(20),
    health_status TEXT,
    personality TEXT,
    special_needs TEXT,
    images JSONB,
    protection_date DATE,
    deadline_date DATE,
    status VARCHAR(20) DEFAULT 'available',
    transfer_decided BOOLEAN DEFAULT false,
    source_url VARCHAR(500),
    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(municipality_id, external_id)
);
```

### 4. scraping_logs (スクレイピング履歴)
```sql
CREATE TABLE scraping_logs (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20),
    tails_found INTEGER DEFAULT 0,
    tails_added INTEGER DEFAULT 0,
    tails_updated INTEGER DEFAULT 0,
    tails_removed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER
);
```

---

## スクレイピングシステム

### 基本方針
1. **礼儀正しいスクレイピング**
   - 3-5秒の間隔を開ける（サーバー負荷を最小限に）
   - robots.txt を尊重
   - User-Agent を明示（目的を明記）
   - 夜間・早朝の実行（アクセス集中時間を避ける）

2. **AI活用**
   - HTML全体を解析して尻尾ちゃん情報を抽出
   - サイト構造変更に自動対応
   - 画像と説明文から尻尾ちゃんの特徴を抽出

3. **定期実行**
   - 2日に1回の全体スクレイピング（負荷とのバランス）
   - 全自治体を均等にローテーション

### Python実装構造
```
scraper/
├── main.py                 # メインスクレイピング制御
├── ai_extractor.py         # AI尻尾ちゃん情報抽出
├── municipality_scraper.py # 自治体別スクレイピング
├── database.py            # DB接続・操作
├── utils.py               # ユーティリティ
└── requirements.txt       # 依存関係
```

---

## UI/UX設計

### デザイン原則
1. **モバイルファースト** - スマホ利用者を最優先
2. **明るい色合い** - 希望を感じさせる暖色系
3. **直感的操作** - 中年層でも使いやすい
4. **緊急性表示** - 残り日数を視覚的に強調

### 主要画面
1. **トップページ**
   - 緊急度の高い猫を全国から表示
   - 簡単検索フォーム
   - 統計情報（掲載中の猫数など）

2. **検索結果ページ**
   - フィルタリング（県、残り日数、性別、サイズ）
   - ソート（残り日数昇順、登録日順）
   - 無限スクロール

3. **猫詳細ページ**
   - 大きな写真表示
   - 詳細情報
   - 自治体連絡先
   - 元サイトへのリンク

4. **自治体一覧ページ**
   - 地域別表示（都道府県・市町村）
   - 各自治体の掲載数

### 色彩設計（三毛猫カラーパレット）
- **メインカラー**: 茶トラ色 (#D2691E) - 温かみのある茶色
- **サブカラー**: 三毛の白 (#FFF8DC) - やわらかな白
- **アクセントカラー**: 三毛の黒 (#2F2F2F) - 落ち着いた黒
- **ハイライト**: 三毛のクリーム (#F5DEB3) - 優しいクリーム
- **特別色**: 肉球ピンク (#FFB6C1) - 可愛らしいピンク
- **青系統**: デニムブルー (#4682B4) - カジュアルで親しみやすい
- **警告色**: 緊急レッド (#DC143C) - 緊急時のみ使用

---

## 機能仕様

### 1. 検索・フィルタリング
- **地域選択**: LocalStorageで記憶
- **残り日数**: 3日以内、1週間以内、1ヶ月以内
- **尻尾ちゃんの特徴**: 性別、年齢、猫種、色
- **ステータス**: 募集中、譲渡決定

### 2. 緊急度表示
- **残り3日**: 赤背景で大きく表示
- **残り1週間**: オレンジ背景で目立つ表示
- **残り1ヶ月**: 黄色背景で注意喚起

### 3. ユーザー設定
- **お気に入り県**: LocalStorageで保存
- **通知設定**: 緊急度の高い猫の表示頻度
- **表示設定**: 一覧/グリッド表示切り替え

### 4. 統計・分析
- **掲載中の猫数**: リアルタイム表示
- **譲渡成功数**: ハッピーエンド表示
- **地域別統計**: 可視化

---

## 運用方針

### 1. 法的配慮
- **免責事項**: 情報の正確性について
- **プライバシーポリシー**: 個人情報の取り扱い
- **利用規約**: サービスの利用条件

### 2. 自治体との関係
- **情報提供のみ**: 仲介は行わない
- **連絡先明示**: 各自治体への直接連絡を促進
- **削除要請対応**: 自治体からの要請に応じる

### 3. 技術的配慮
- **サーバー負荷軽減**: 適切な間隔でのスクレイピング
- **エラーハンドリング**: 異常時の自動復旧
- **データバックアップ**: 定期的なデータ保護

---

## 開発フェーズ

### Phase 1: 基盤構築 ✅ **完了** (2024-12-30)
**目標**: 最小限のシステムで動作確認

#### 1.1 プロジェクト初期化 ✅
- [x] Next.js プロジェクト作成
- [x] TypeScript + Tailwind CSS 設定
- [x] 基本的なディレクトリ構造作成
- [x] package.json の依存関係設定

#### 1.2 データベース環境構築 ✅
- [x] PostgreSQL Docker Compose 設定
- [x] 環境変数設定 (.env.local)
- [x] データベース接続確認
- [x] 基本テーブル作成 (regions, municipalities, tails, scraping_logs)

#### 1.3 Next.js API基盤 ✅
- [x] PostgreSQL接続ライブラリ設定
- [x] 基本的なAPI Routes作成 (/api/tails)
- [x] CRUD操作の実装
- [x] API動作確認

#### 1.4 シンプルなフロントエンド ⏳ 部分完了
- [x] トップページ作成
- [x] 三毛猫カラーパレット適用
- [x] レスポンシブデザイン
- [ ] 猫一覧ページ完成
- [ ] 検索機能実装
- [ ] 尻尾ちゃんリスト表示
- [ ] 三毛猫カラーパレット適用
- [ ] レスポンシブデザイン基本実装

---

### Phase 2: スクレイピングシステム ✅ **完了** (2024-12-30)
**目標**: 1つの自治体サイトから情報を取得

#### 2.1 Python環境構築 ✅
- [x] Poetry パッケージ管理採用
- [x] BeautifulSoup + requests基本実装
- [x] データベース接続 (Python)
- [x] 基本的なスクレイピング動作確認

#### 2.2 ローカル情報抽出システム ✅
- [x] **保守的パターンマッチング猫情報抽出** (見逃し防止重視)
- [x] 正規表現ベースのデータ解析
- [x] **汎用HTMLセレクタ自動検出** (全国自治体対応)
- [x] **積極的キーワード検索** (破損HTML対応)
- [x] エラーハンドリング実装

#### 2.3 スクレイピング管理 ✅
- [x] 礼儀正しいスクレイピング実装 (4秒間隔)
- [x] robots.txt確認機能
- [x] **詳細スクレイピング履歴の記録** (scraping_logs)
- [x] **石川県で完全動作確認** (24匹発見!)

#### 2.4 追加実装完了 🆕
- [x] **HTMLサンプリング・リグレッションテスト**
- [x] **ヘルスモニタリング・ウォッチドッグ**
- [x] **統計ダッシュボードAPI** (Next.js連携用)
- [x] **JavaScript動的コンテンツ検出**

---

### Phase 3: UI/UX完成 (2週間)
**目標**: ユーザーが使いやすい検索・表示機能

#### 3.1 検索・フィルタリング機能
- [ ] 地域選択機能
- [ ] 残り日数フィルタ
- [ ] 猫種・性別・年齢フィルタ
- [ ] 検索結果のソート機能

#### 3.2 緊急度表示システム
- [ ] 残り日数の計算・表示
- [ ] 緊急度別の色分け表示
- [ ] カウントダウン表示
- [ ] トップページの緊急猫表示

#### 3.3 詳細表示・ユーザビリティ
- [ ] 猫詳細ページ
- [ ] 画像表示・エラーハンドリング
- [ ] 自治体連絡先表示
- [ ] LocalStorage設定保存

---

### Phase 4: 運用準備・拡張 (1-2週間)
**目標**: 本番環境での安定運用

#### 4.1 Docker化・デプロイ準備
- [ ] Docker Compose完成版
- [ ] 本番環境用設定
- [ ] GitHub Actions CI/CD
- [ ] 環境変数管理

#### 4.2 複数自治体対応
- [ ] 自治体データの一括登録
- [ ] 複数サイトの並列スクレイピング
- [ ] スクレイピング状況の監視
- [ ] エラー通知システム

#### 4.3 法的・運用面の整備
- [ ] 免責事項ページ
- [ ] プライバシーポリシー
- [ ] 利用規約
- [ ] サイトマップ・robots.txt

#### 4.4 最終調整
- [ ] パフォーマンス最適化
- [ ] セキュリティチェック
- [ ] 本番環境デプロイ
- [ ] 運用監視設定

---

## 🎯 **現在の状況** (2024-12-30)

### ✅ **完了した成果**
- **基盤システム**: Next.js + PostgreSQL + Python スクレイピング環境完成
- **実証実験**: **石川県で24匹の保護猫を発見** (実際のサイトから)
- **保守的抽出**: 猫の見逃し防止アルゴリズム実装
- **運用監視**: ヘルスチェック・統計システム完備
- **全国対応**: 汎用スクレイパーで他の自治体にも対応可能

### ⚠️ **判明した技術課題**
- **JavaScript動的コンテンツ**: いしかわ動物愛護センターはJS読み込み
- **解決策**: Playwright導入 (Selenium比較で推奨)

### 🚀 **次回セッションの優先事項**
1. **Playwright MCP導入** - 動的サイト対応
2. **石川県サイトの詳細情報抽出精度向上**
3. **Next.js統計ダッシュボード実装**
4. **他都道府県サイト調査**

---

## 📊 **テスト結果データ**

### 石川県スクレイピングテスト (2024-12-30)
- **いしかわ動物愛護センター**: 20匹発見
- **金沢市動物愛護管理センター**: 4匹発見
- **合計**: 24匹の保護猫を抽出成功
- **技術課題**: JavaScriptによる動的読み込みを検出

---

## 実装記録

**Phase 1.1**: Next.jsプロジェクト作成 ✅ 完了
**Phase 2**: スクレイピングシステム ✅ 完了 (実証済み)

---

## 追加アイデア

### 1. ユーザー体験向上
- **かわいい猫のイラスト**: サイト全体に配置
- **0円の猫**: キャッチフレーズ（要検討）
- **成功事例紹介**: 譲渡決定時のハッピーストーリー

### 2. 拡張機能
- **犬情報対応**: 保護犬も同様に対応
- **SNS連携**: 情報拡散機能
- **アラート機能**: 緊急度の高い猫の通知

### 3. 技術的改善
- **画像表示最適化**: 外部画像の遅延読み込み・エラーハンドリング
- **PWA対応**: オフライン閲覧機能
- **多言語対応**: 将来的な国際化

---

## 開発環境

### ローカル開発
```bash
# 環境構築
git clone https://github.com/kako-jun/tail-match.git
cd tail-match
npm install

# Docker環境起動
docker-compose up -d

# 開発サーバー起動
npm run dev
```

### 本番環境
- **URL**: https://tail-match.llll-ll.com
- **サーバー**: GCE インスタンス
- **デプロイ**: GitHub Actions経由

---

## 緊急度に基づく表示戦略

### 最重要: 残り日数による表示
1. **残り1日**: トップページ最上部、点滅効果
2. **残り2-3日**: トップページ上部、赤背景
3. **残り4-7日**: 検索結果上位、オレンジ背景
4. **残り8-14日**: 通常表示、黄色アクセント

### 地域を超えた表示
- ユーザーの設定県に関係なく、緊急度の高い猫は全国表示
- 「遠くても助けたい」という気持ちに応える

### 感情的な訴求
- **カウントダウン表示**: 「あと○日」
- **ハートアイコン**: 愛情を表現
- **希望のメッセージ**: 「この子を待っている家族がいます」

---

この仕様書は、猫の命を最優先に考えた設計思想に基づいています。技術的な実装と、ユーザーの心に訴えかける UI/UX の両方を重視し、1匹でも多くの猫を救うことを目指します。