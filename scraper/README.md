# Tail Match Scraper

保護猫マッチングサービス「Tail Match」のスクレイピングシステムです。

## セットアップ

### 1. Poetry のインストール

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### 2. 依存関係のインストール

```bash
cd scraper
poetry install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
# .env ファイルを編集してデータベース設定等を入力
```

## 使用方法

### 基本テスト

```bash
# 全体テスト実行
poetry run python test_run.py

# データベース接続テスト
poetry run python main.py --test-db

# 自治体一覧表示
poetry run python main.py --list
```

### スクレイピング実行

```bash
# 特定の自治体をスクレイピング
poetry run python main.py --municipality 1 --type test

# 全自治体をスクレイピング
poetry run python main.py --all --type test

# シンプルスクレイパーを使用
poetry run python main.py --municipality 1 --type simple
```

### 開発コマンド

```bash
# コードフォーマット
poetry run black .
poetry run isort .

# リンター実行
poetry run flake8 .
poetry run mypy .

# テスト実行
poetry run pytest

# カバレッジ付きテスト
poetry run pytest --cov=. --cov-report=html
```

## Docker 使用

```bash
# イメージビルド
docker build -t tail-match-scraper .

# コンテナ実行
docker run --rm tail-match-scraper --test-db
```

## ファイル構成

- `main.py` - メインエントリーポイント
- `config.py` - 設定管理
- `database.py` - データベース接続・操作
- `scraper_base.py` - スクレイパー基底クラス
- `test_scraper.py` - テスト用スクレイパー実装
- `test_run.py` - テスト実行スクリプト

## 設定

環境変数または `.env` ファイルで以下を設定：

- `DATABASE_URL` - PostgreSQL接続URL
- `SCRAPING_ENABLED` - スクレイピング有効フラグ
- `SCRAPING_INTERVAL_SECONDS` - リクエスト間隔（秒）
- `OPENAI_API_KEY` - OpenAI API キー（AI機能用）
- `LOG_LEVEL` - ログレベル（DEBUG, INFO, WARNING, ERROR）

## 開発ガイドライン

1. **礼儀正しいスクレイピング**
   - 4秒以上の間隔を保つ
   - robots.txt を確認
   - 適切な User-Agent を設定

2. **エラーハンドリング**
   - 全ての例外をキャッチ
   - ログに詳細を記録
   - 適切なリトライ処理

3. **データベース操作**
   - トランザクションを適切に使用
   - エラー時のロールバック
   - 重複データの適切な処理

## トラブルシューティング

### データベース接続エラー

1. PostgreSQL が起動していることを確認
2. 環境変数が正しく設定されていることを確認
3. ファイアウォール設定を確認

### スクレイピングエラー

1. 対象サイトが利用可能か確認
2. robots.txt の内容を確認
3. リクエスト間隔が適切か確認