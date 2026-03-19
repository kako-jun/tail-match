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

# 依存関係インストール
npm install

# 開発サーバー起動（D1バインディングをローカルでエミュレート）
npm run dev

# ブラウザでアクセス
open http://localhost:3000
```

### 本番デプロイ（Cloudflare Pages + D1）

```bash
# ビルド
npx @cloudflare/next-on-pages

# デプロイ
npx wrangler pages deploy .vercel/output/static --project-name tail-match

# ローカルSQLite → D1 データ同期
node scripts/core/sync-to-d1.js
```

## 📁 プロジェクト構成

```
tail-match/
├── src/                    # Next.js フロントエンド
│   ├── app/               # App Router
│   ├── components/        # Reactコンポーネント
│   └── lib/               # ユーティリティ
├── scripts/scrapers/      # JS スクレイピングシステム（都道府県別）
│   ├── ishikawa/         # 石川県（aigo-ishikawa, kanazawa-city-cats）
│   ├── tokyo/            # 東京都（tokyo-metro-cats）
│   └── ...               # 各都道府県ごとに scrape.js + html-to-yaml.js
├── database/              # データベーススキーマ
│   └── schema-sqlite.sql # SQLiteスキーマ定義
├── scripts/core/          # パイプライン（スクレイピング・DB同期）
├── wrangler.toml          # Cloudflare Pages + D1 設定
└── compose.yaml           # Docker Compose (レガシー、未使用)
```

## 🛠 技術スタック

### フロントエンド

- **Next.js 15** - React 19 + TypeScript
- **Material-UI (MUI)** - デザインシステム
- **三毛猫カラーパレット** - 温かみのあるUI

### バックエンド

- **Next.js API Routes** (Edge Runtime) - サーバーサイドAPI
- **Cloudflare D1** (SQLite互換) - 本番データベース
- **better-sqlite3** - ローカルスクレイピング用DB
- **JavaScript + Playwright** - スクレイピングシステム

### インフラ

- **Cloudflare Pages** - ホスティング (@cloudflare/next-on-pages)
- **Cloudflare D1** - サーバーレスデータベース
- **launchd** - macOSでの定期スクレイピング実行

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
npm run dev                 # 開発サーバー起動（D1ローカルエミュレーション）
npm run build              # 本番ビルド
npm run lint               # ESLint実行
npm run lint:fix           # ESLint自動修正
npm run format             # Prettier実行（全ファイル）
npm run format:check       # Prettierチェック（CIで使用）

# Cloudflare Pages ビルド・デプロイ
npx @cloudflare/next-on-pages          # Pages用ビルド
npx wrangler pages deploy .vercel/output/static --project-name tail-match

# スクレイピング
bash scripts/core/run-all-scrapers.sh  # 全施設スクレイピング
node scripts/core/sync-to-d1.js       # ローカルDB → D1同期

# D1 確認
npx wrangler d1 execute tail-match-db --remote --command="SELECT COUNT(*) FROM tails;"
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

- **基盤システム**: Next.js + Cloudflare D1 + Playwright スクレイピング
- **本番デプロイ**: Cloudflare Pages + D1 で稼働中（547匹掲載）
- **UI/UX**: 検索（URLクエリ同期対応）・フィルタリング・緊急度表示・ギャラリー・統計リンク化・favicon
- **スクレイピング**: 28施設対応、launchd自動実行 + 異常検知
- **管理画面**: 履歴表示・統計ダッシュボード

### 🚀 次期実装予定

- 残り27都府県のスクレイパー実装
- お気に入り/ブックマーク機能
- layout.tsx SSR化（SEO改善）
- Unsplash画像の自前素材への差し替え

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
