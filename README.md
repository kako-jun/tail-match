# Tail Match - 保護猫マッチングサービス

全国の自治体保護猫情報を集約し、殺処分を防ぐためのマッチングサービス

## 🐾 概要

日本全国の自治体保護猫情報を自動収集し、一元的に検索・閲覧できるサービスです。AIを活用したスクレイピングシステムで、各自治体サイトから保護猫情報を自動取得します。

## 🚀 クイックスタート

### 開発環境

```bash
# リポジトリをクローン
git clone https://github.com/kako-jun/tail-match.git
cd tail-match

# 環境変数設定
cp .env.example .env.local
# .env.local を編集してデータベース情報等を設定

# Docker Compose で起動
docker compose up -d

# ブラウザでアクセス
open http://localhost:3000
```

### 本番環境

```bash
# 本番環境用設定
cp .env.prod .env.local
# .env.local を編集

# 本番環境で起動
docker compose -f compose.yaml -f compose.prod.yaml up -d

# または自動デプロイスクリプト使用
./scripts/deploy.sh production
```

## 📁 プロジェクト構成

```
tail-match/
├── src/                    # Next.js フロントエンド
│   ├── app/               # App Router
│   ├── components/        # Reactコンポーネント
│   └── lib/               # ユーティリティ
├── scraper/               # Python スクレイピングシステム
│   ├── main.py           # メインスクレイパー
│   ├── local_extractor.py # AI抽出エンジン
│   └── database.py       # DB操作
├── database/              # データベース設定
├── nginx/                # Nginx設定
├── scripts/              # デプロイスクリプト
├── compose.yaml          # Docker Compose (開発)
└── compose.prod.yaml     # Docker Compose (本番)
```

## 🛠 技術スタック

### フロントエンド

- **Next.js 15** - React 19 + TypeScript
- **Material-UI (MUI)** - デザインシステム
- **三毛猫カラーパレット** - 温かみのあるUI

### バックエンド

- **Next.js API Routes** - サーバーサイドAPI
- **PostgreSQL** - メインデータベース
- **Python + Poetry** - スクレイピングシステム
- **BeautifulSoup + Playwright** - 静的・動的コンテンツ対応

### インフラ

- **Docker Compose** - コンテナオーケストレーション
- **Nginx** - リバースプロキシ
- **GitHub Actions** - CI/CD

## 🐱 スクレイピング機能

### 対応自治体

- **石川県**: いしかわ動物愛護センター（24匹発見済み）
- **金沢市**: 動物愛護管理センター
- **全国拡張対応**: 汎用スクレイパーで他自治体対応可能

### AI抽出システム

- **保守的パターンマッチング**: 見逃し防止重視
- **JavaScript動的コンテンツ**: Playwright対応
- **フォールバック機能**: 破損HTML対応
- **礼儀正しいスクレイピング**: 4秒間隔、robots.txt尊重

## 📊 管理機能

### スクレイピング監視

- **管理画面**: `/admin/scraping`
- **実行履歴**: タイムライン表示
- **統計ダッシュボード**: 成功率・実行時間・発見数
- **エラー監視**: フォールバック警告

### API エンドポイント

```
GET /api/tails              # 保護猫一覧
GET /api/tails/urgent       # 緊急度高
GET /api/admin/scraping/logs # スクレイピング履歴
GET /api/admin/scraping/stats # 統計情報
```

## 🔧 開発コマンド

```bash
# フロントエンド開発
npm run dev                 # 開発サーバー起動
npm run build              # 本番ビルド
npm run lint               # ESLint実行
npm run lint:fix           # ESLint自動修正
npm run format             # Prettier実行（全ファイル）
npm run format:check       # Prettierチェック（CIで使用）

# スクレイピング開発
cd scraper
poetry install             # 依存関係インストール
poetry run python main.py  # スクレイパー実行
poetry run python test_ishikawa_direct.py # テスト実行

# Docker 操作
docker compose up -d        # 開発環境起動
docker compose logs -f      # ログ表示
docker compose down         # 停止

# 本番環境
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

## 🪝 Git Hooks（自動フォーマット）

このプロジェクトでは、コミット時に自動的にコードをフォーマットするGit hookを使用しています。

### 仕組み

- **husky**: Git hookを管理
- **lint-staged**: ステージングされたファイルのみ処理
- **prettier**: コードを自動フォーマット

### 動作

```bash
git add .
git commit -m "メッセージ"
# ↑ コミット前にprettierが自動実行され、コードがフォーマットされます
```

### 設定ファイル

- `.husky/pre-commit`: pre-commitフック
- `.prettierrc`: Prettier設定
- `package.json` の `lint-staged`: 実行ルール

### 手動フォーマット

```bash
# プロジェクト全体をフォーマット
npm run format

# フォーマットチェック（修正せずチェックのみ）
npm run format:check
```

## 🎯 現在の状況

### ✅ 完了機能

- **基盤システム**: Next.js + PostgreSQL + Python完成
- **UI/UX**: 検索・フィルタリング・緊急度表示
- **スクレイピング**: 石川県で24匹発見（フォールバック）
- **管理画面**: 履歴表示・統計ダッシュボード

### ⚠️ 技術課題

- **JavaScript必須サイト**: 動的コンテンツ対応が必要
- **Playwright統合**: 一部のサイトで必須
- **データ品質**: フォールバック抽出の精度向上

### 🚀 次期実装予定

- **Phase 4.2**: 複数自治体対応システム
- **Phase 4.3**: 法的整備（免責事項・プライバシーポリシー）
- **Playwright統合**: 全動的サイト対応

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエスト歓迎！特に：

- 新しい自治体サイト対応
- スクレイピング精度向上
- UI/UX改善

## 📞 連絡先

- **Developer**: kako-jun
- **Website**: https://tail-match.llll-ll.com
- **Repository**: https://github.com/kako-jun/tail-match

---

**🐾 1匹でも多くの猫を救うために**
