# 富山県動物管理センター スクレイパー

## 概要

- **URL**: https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/cat.html
- **Municipality ID**: toyama/toyama-pref
- **対象**: 富山県動物管理センターの保護猫譲渡ページ

## HTML構造

富山県のページは以下の特徴があります：

```html
<div class="col2">
  <div class="col2L">
    <p style="text-align: center;">
      <img alt="譲渡動物情報ねこ7002" src="/images/13938/7002.png" />
      <br />
      <a href="/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/cat7002.html">
        No.7002<br />
        アイ（オス）
      </a>
    </p>
  </div>
  <div class="col2R">...</div>
</div>
```

**特徴**:

- `div.col2L` と `div.col2R` に各猫の情報が2カラムレイアウトで配置
- リンクテキストが「No.○○○\n名前（性別）」形式
- 画像URLは相対パス（`/images/...`）
- 詳細ページへのリンクがある（一部の猫のみ）

**抽出方法**:

1. `div.col2L, div.col2R` を全て取得
2. 各コンテナから `img` タグで画像URL取得
3. `a` タグのテキストから ID・名前・性別を抽出
4. 正規表現で「No.7002」「アイ（オス）」をパース

## 実行方法

### 1. HTML収集（Playwright）

```bash
node scripts/scrapers/toyama-pref/scrape.js
```

**処理内容**:

- Playwrightでブラウザを起動しJavaScript実行後のHTMLを取得
- プロキシ対応（環境変数 `HTTPS_PROXY` / `HTTP_PROXY`）
- リトライ機能（最大3回）
- 礼儀正しいスクレイピング（3秒待機）

**出力**:

- `data/html/toyama/toyama-pref/YYYYMMDD_HHMMSS_tail.html`
- `data/html/toyama/toyama-pref/latest_metadata.json`

### 2. YAML抽出（Cheerio）

```bash
node scripts/scrapers/toyama-pref/html-to-yaml.js
```

**処理内容**:

- 最新HTMLファイルから猫データを抽出
- 名前・性別・IDを正規表現で解析
- 画像URLを絶対パスに正規化
- クロスチェック（性別言及数、画像タグ数の整合性確認）

**出力**:

- `data/yaml/toyama/toyama-pref/YYYYMMDD_HHMMSS_tail.yaml`

### 3. DB投入

```bash
# DRY-RUN（確認のみ）
node scripts/yaml-to-db.js --dry-run

# 本番投入
node scripts/yaml-to-db.js
```

## 実績データ

### 2025-11-12 実行結果

- **発見数**: 8匹
- **成功投入**: 8匹（名前不明1匹を含む）
- **信頼度**: HIGH
- **スキップ**: 0匹

**抽出された猫**:

1. アイ（オス）- No.7002
2. サク（オス）- No.7007
3. ミっち（オス）- No.7057
4. ゆう（メス）- No.7068
5. よう（オス）- No.7101
6. らいあ（オス）- No.7102
7. てと（オス）- No.7103
8. 保護猫8号（性別不明）- 名前情報なし

## トラブルシューティング

### 問題: 画像URLが空

**原因**: 画像の相対パス処理が不適切

**解決方法**:

```javascript
if (imageUrl.startsWith('/')) {
  normalizedImageUrl = 'https://www.pref.toyama.jp' + imageUrl;
}
```

### 問題: 名前が抽出できない

**原因**: リンクテキストのパース失敗

**解決方法**:

- 正規表現パターンを確認
- `pText` からも抽出を試行（リンクがない場合）
- 名前がない場合は「保護猫○号」として自動生成

### 問題: 性別が不明

**原因**: 一覧ページに性別情報がない猫がいる

**解決方法**:

- 性別が不明でもスキップせず投入（gender: 'unknown'）
- 詳細ページから追加情報を取得する仕組みを将来的に実装

## セレクタ情報

| 項目       | セレクタ               |
| ---------- | ---------------------- |
| 猫コンテナ | `div.col2L, div.col2R` |
| 画像       | `img`                  |
| リンク     | `a`                    |
| テキスト   | `p`                    |

## 注意事項

1. **都道府県階層は必須**: `toyama/toyama-pref` のようにパス形式
2. **画像URLは絶対パスに変換**: 相対パス（`/images/...`）を `https://www.pref.toyama.jp/images/...` に
3. **名前不明の猫も投入**: デフォルト名「保護猫○号」を自動生成
4. **詳細ページURL**: 一覧ページのURLをデフォルトとして設定

## 関連ドキュメント

- [scripts/README.md](../../README.md) - 3ステップパイプライン説明
- [.claude/NEW_MUNICIPALITY_GUIDE.md](../../../.claude/NEW_MUNICIPALITY_GUIDE.md) - 新規自治体追加ガイド

---

**最終更新**: 2025-11-12
**ステータス**: 動作確認済み
