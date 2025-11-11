# scraper-python-backup/ - Python実装（バックアップ）

**ステータス**: 参考実装・テスト用のみ
**本番実装**: `/scripts/` (Node.js)

---

## 📌 このディレクトリの役割

### 1. **GitHub Actions 実装パターンの参考**

- `.github/workflows/ci-cd.yml:54-104` でPythonテスト実行の例
- CI/CDパイプラインの実装パターン
- ヘルスチェック・監視の実装例

### 2. **開発時のテスト実行**

```bash
# サイト構造調査
cd scraper-python-backup
poetry run python test_site_structure.py

# 石川県直接テスト
poetry run python test_ishikawa_direct.py

# ヘルスチェック
poetry run python health_check.py --simple
```

### 3. **動作確認済みロジックの参考**

- プロキシ対応 (`scraper_base.py`)
- JavaScript検出 (`test_javascript_content.py`)
- HTML保存パターン (`html_sampler.py`)

---

## ⚠️ 重要: 本番では使用しない

**本番のスクレイピングは `/scripts/` (Node.js) で実装**

理由:

- ✅ Next.jsプロジェクトと技術統一
- ✅ SQLite (`better-sqlite3`) 統合
- ✅ 依存関係シンプル化
- ✅ osaka-kenpo + kanazawa-dirt パターン採用

---

## 🔄 Node.js版への移行マッピング

| Python (旧)              | Node.js (新)                             | 用途               |
| ------------------------ | ---------------------------------------- | ------------------ |
| `health_check.py`        | `/scripts/lib/health-check.js`           | ヘルスチェック     |
| `test_site_structure.py` | `/scripts/lib/detect-javascript-site.js` | JS必須サイト検出   |
| `ishikawa_scraper.py`    | `/scripts/scrape-ishikawa.js`            | 石川県スクレイパー |
| `html_sampler.py`        | `/scripts/lib/html-saver.js`             | HTML保存ロジック   |
| `database.py`            | `/scripts/lib/db.js`                     | DB接続（SQLite）   |

---

**削除せず保存している理由**: GitHub Actions実装・テスト戦略の参考として価値あり

**最終更新**: 2025-11-11
