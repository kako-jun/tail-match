FROM python:3.11-slim

WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Poetry をインストール
RUN pip install poetry

# Poetry の設定
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# pyproject.toml と poetry.lock をコピー
COPY pyproject.toml poetry.lock* ./

# 依存関係をインストール
RUN poetry install --only=main && rm -rf $POETRY_CACHE_DIR

# スクレイパーコードをコピー
COPY . .

# 実行権限を設定
RUN chmod +x main.py

# デフォルトコマンド
CMD ["poetry", "run", "python", "main.py"]