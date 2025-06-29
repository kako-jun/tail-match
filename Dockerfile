FROM node:18-alpine

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# Next.js のビルド（開発時はスキップ）
# RUN npm run build

EXPOSE 3000

# 開発サーバー起動
CMD ["npm", "run", "dev"]