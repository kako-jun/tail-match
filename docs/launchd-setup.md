# launchd 自動スクレイピング セットアップ手順

tail-matchの自動スクレイピングをmacOSのlaunchdで実行するための手順。

## 前提

- Node.js（Volta経由）がインストールされていること
- `npm install` 済みであること（wranglerがnode_modules内にある）
- Claude Code CLI（`~/.local/bin/claude`）がインストールされていること

## 手順

### 1. wrangler ログイン

```bash
cd ~/repos/2025/tail-match
./node_modules/.bin/wrangler login
```

ブラウザが開くのでCloudflareで「Allow」。OAuth トークンが `~/Library/Preferences/.wrangler/config/default.toml` に保存される。

### 2. plist インストール

```bash
cp scripts/core/launchd/com.kako-jun.tail-match-scrape.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.kako-jun.tail-match-scrape.plist
```

### 3. 動作確認

```bash
# 手動実行（全施設スクレイプが走るので2時間以上かかる）
launchctl start com.kako-jun.tail-match-scrape

# ログ確認
tail -f /tmp/tail-match-scrape.log

# 詳細ログ
ls -1 ~/repos/2025/tail-match/logs/scraping/ | sort -r | head -5
```

### 4. トラブルシューティング

#### D1同期が `WARNING: D1同期に失敗しました` で失敗する

OAuthトークンが期限切れの可能性。再ログインする:

```bash
cd ~/repos/2025/tail-match
./node_modules/.bin/wrangler login
```

トークンは `~/Library/Preferences/.wrangler/config/default.toml` に保存される。
wranglerは `refresh_token` で自動更新するが、長期間PCが起動していなかった場合に期限切れになることがある。

#### Claude修復が `command not found` で失敗する

plistのPATHに `~/.local/bin` が含まれていることを確認:

```xml
<string>/Users/USERNAME/.volta/bin:/Users/USERNAME/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
```

#### スクレイプ自体が失敗する

Playwrightのブラウザが必要:

```bash
npx playwright install chromium
```

## パイプライン概要

```
launchd (毎日 AM 3:17)
  └── auto-scrape.sh
      ├── Step 1: 全施設スクレイプ（Playwright → HTML → YAML → ローカルSQLite）
      ├── Step 2: D1同期（ローカルSQLite → Cloudflare D1）
      ├── Step 3: 異常検知（check-anomalies.js）
      └── Step 4: 異常時のみ Claude CLI で自動修復
```

## 別PCへの移行

1. リポジトリをclone
2. `npm install`
3. `npx playwright install chromium`
4. `wrangler login`
5. plistをコピーしてlaunchctl load（USERNAMEを書き換え）
6. Claude Code CLIをインストール
