# よくある間違いと学んだ教訓

過去の失敗から学んだ教訓をまとめたもの。新規自治体を追加する際は必ず参照してください。

「やるべきこと」は `docs/scraping.md` を参照してください。

---

## よくある間違い（やってはいけないこと）

### 1. `scraper-python-backup` を使おうとする

- このフォルダは凍結されたバックアップです
- 現在のスクレイパーは **Node.js** ベース（`scripts/scrapers/`）

### 2. `archive` ディレクトリを作ろうとする

- HTMLファイルと `latest_metadata.json` は**同じ階層**に並べる
- ❌ `data/html/ishikawa/aigo-ishikawa/archive/20251112_tail.html`
- ✅ `data/html/ishikawa/aigo-ishikawa/20251112_tail.html`

### 3. 都道府県階層を省略する

- ❌ `data/html/kanazawa-city/`
- ✅ `data/html/ishikawa/kanazawa-city/`

### 4. municipality設定を間違える

- ❌ `municipality: 'kanazawa-city'`
- ✅ `municipality: 'ishikawa/kanazawa-city'`

### 5. いちいちスクリプトで処理する

- ファイル移動などは直接コマンドを提案する
- スクリプトファイルを作成しない

### 6. `data/shelters.yaml` を確認せずに進める

- 新規自治体追加時は必ず最初に確認
- URLや連絡先情報が既に登録されている
- Web検索せずにまずローカルの情報を確認する

### 7. YAML出力時にmetaセクションを忘れる

- `yaml.dump()` の構造に**必ず `meta:` セクション**を含める
- ❌ トップレベルに `municipality`, `source_url` を配置
- ✅ `meta` オブジェクト内に配置

### 8. yaml-to-db.js の municipalities 配列に追加し忘れる

- 新規自治体を追加したら**必ず `CONFIG.municipalities` に追加**
- 追加しないとDB投入時にスキップされる

---

## チェックリスト

### 実装前

- [ ] 対象URLを確認した
- [ ] HTMLサンプルを取得した
- [ ] セレクタを調査した
- [ ] JavaScript必須か確認した
- [ ] 犬用ページの存在確認を実施した

### 実装中

- [ ] municipality をパス形式で設定した（例: `'ishikawa/kanazawa-city-cats'`）
- [ ] htmlDir/yamlDir にサフィックス（-cats/-dogs）を含めた
- [ ] セレクタを実際のHTMLに合わせた
- [ ] 画像取得のDOM構造を確認した
- [ ] 共通ヘルパー関数をインポートした（`getAdoptionStatus`, `determineAnimalType`）
- [ ] 譲渡済み判定に `getAdoptionStatus()` を使用した
- [ ] 犬猫混在ページの場合、`determineAnimalType()` を使用した
- [ ] **履歴ロガーを統合した**:
  - [ ] scrape.js に `createLogger` + `logHTMLCount()` 追加
  - [ ] `countAnimalsInHTML()` 関数定義を追加（重要！）
  - [ ] html-to-yaml.js に `logYAMLCount()` 追加
  - [ ] 変数名確認（allCats/allDogs/allAnimals）
  - [ ] try-catch + finalize() 追加

### 実装後

- [ ] HTML収集が成功した（ファイルサイズ確認）
- [ ] YAML抽出が成功した（動物が抽出された）
- [ ] 履歴ロガーが正常動作（HTML count・YAML count が記録、不一致警告なし）
- [ ] animal_type が正しく設定されている（'cat' または 'dog'）
- [ ] status が正しく設定されている（'available', 'adopted', 'removed'）
- [ ] 画像URLが空でない
- [ ] 信頼度が HIGH または MEDIUM
- [ ] README を作成した
- [ ] run-all-scrapers.sh に追加した
- [ ] 全角・半角混在をチェックした（括弧・スペース・ハイフン）

---

## 学んだ教訓

### 金沢市追加時

1. archiveディレクトリは不要 — HTMLとmetadata.jsonは同じ階層
2. 都道府県階層は必須 — `ishikawa/` を省略してはいけない
3. municipalityはパス形式 — `'ishikawa/kanazawa-city'` のように指定
4. セレクタは緩く — 中間要素（table-wrapperなど）を考慮する
5. 画像はDOM構造を確認 — `.closest()` や `.prev()` の対象を正確に
6. 直接コマンド実行 — ファイル移動などでスクリプトを作らない

### 那覇市・犬用ページ発見時（2025-11-12）

7. 犬も対象であることを忘れない — プロジェクトは猫専用ではない
8. 犬用ページの存在確認は必須 — cat.html → dog.html のパターンが多い
9. animal_type を明示的に設定 — 'cat' または 'dog' をハードコードしない
10. status フィールドも必須 — 譲渡済み情報（available/adopted/removed）を抽出
11. 7施設で犬用ページを見逃していた — 横断的なURL確認の重要性

### 共通ヘルパー関数導入時（2025-11-13）

12. 共通ロジックは必ず関数化する — 全28施設で同じ判定ロジックを書かない
13. 「ワンちゃん」「わんちゃん」などの愛称表記を忘れない — カタカナ・ひらがな・漢字すべてカバー
14. 譲渡済みキーワードは包括的に — 施設ごとの表現の違いを吸収する
15. 共通関数は scripts/lib/ に配置 — 全スクレイパーからアクセス可能
16. 新規追加時は必ず共通関数を使用 — 手動判定を書かない

### 命名規則統一時（2025-11-13）

17. 猫専用ページには `-cats` サフィックスを付ける — 犬用ページとの統一感
18. 混在ページにはサフィックスを付けない — 明確な区別
19. 命名規則は一貫性が最重要 — 将来の保守性に直結
20. ディレクトリ名とmunicipality設定は必ず一致させる — データの整合性を保つ

---

## ベストプラクティス

### データ品質

1. **個体識別子の重複防止** — 1つの管理番号に複数の個体がある場合、サフィックスで一意化
2. **デフォルト名の生成** — 名前がない場合は「保護猫XXX号」などを自動生成
3. **メタデータの完全性** — YAML出力時に必ず `meta:` セクションを含める

### コード品質

1. **共通関数の活用** — `getAdoptionStatus()`, `determineAnimalType()`, `getJSTTimestamp()`
2. **タイムゾーン統一** — `new Date().toISOString()` ではなく `getJSTISOString()` を使う
3. **パス形式の統一** — municipality は必ず `{prefecture}/{municipality}` 形式

### 実装フロー

1. **事前調査を徹底** — `data/shelters.yaml` の情報を必ず確認、犬用ページの存在確認も
2. **段階的テスト** — HTML収集 → YAML抽出 → DRY-RUN → DB投入
3. **最終チェックリスト活用** — `docs/scraping.md` の Step 7 を参照

---

## バグ修正事例

### 千葉市: 括弧パターン問題（2025-11-13）

**症状**: HTML検出17匹、YAML抽出15匹（2匹減少）

**原因**: html-to-yaml.js の正規表現が全角括弧（）のみを認識。HTMLには半角括弧()を使った動物が2匹存在。

**修正**:

```javascript
// 修正前
const match = heading.match(/(\d{8})（(.+?)）/);

// 修正後 - 全角（）と半角()の両方に対応
const match = heading.match(/(\d{8})[（(](.+?)[）)]/);
```

**教訓**: 日本語HTMLでは全角・半角の混在が頻繁。`[（(]` と `[）)]` で両方に対応すべき。

### 複数施設: countAnimalsInHTML未定義エラー（2025-11-13）

**症状**: `ReferenceError: countAnimalsInHTML is not defined`

**原因**: 履歴ロガー統合時に `logHTMLCount(countAnimalsInHTML(html))` を追加したが、関数本体を追加し忘れた（10施設で発生）

**修正**:

```bash
node scripts/fix-missing-count-function.js
```

**教訓**: 履歴ロガー統合時は関数定義も同時に追加すること。

### 複数施設: allAnimals未定義エラー（2025-11-13）

**症状**: `ReferenceError: allAnimals is not defined`

**原因**: コピー&ペーストミス。`logger.logYAMLCount(allAnimals.length)` としているが実際の変数名は `allCats` や `allDogs`。

**修正**:

```javascript
logger.logYAMLCount(allCats.length); // 猫の場合
logger.logYAMLCount(allDogs.length); // 犬の場合
```

**教訓**: 実際の変数名を確認してからロガー呼び出しを追加すること。

### 複数施設: ディレクトリパスエラー（2025-11-13）

**症状**: `ENOENT: no such file or directory, scandir 'data/html/ishikawa/kanazawa-city'`

**原因**: CONFIG.htmlDir と実際のディレクトリ名が不一致（例: `kanazawa-city` vs `kanazawa-city-cats`）

**修正**:

```javascript
htmlDir: 'data/html/ishikawa/kanazawa-city-cats', // サフィックスを含める
```

**教訓**: CONFIG設定はディレクトリ構造と完全一致させること。

### 横浜市: 多段階スクレイパーでロガー未統合（2025-11-13）

**症状**: YAML count が前回の値を継承（27匹）、実際の画像数は9匹

**原因**: 多段階スクレイパー（scrape.js → extract-from-images.js）の中間ステップでロガー未統合

**修正**: extract-from-images.js に createLogger を追加し、`logYAMLCount(imageUrls.length)` で記録

**教訓**: 多段階スクレイパーでは全ステップでロガー統合が必要。特殊ケースを見落とさないこと。

---

このドキュメントは、同じミスを繰り返さないための記録です。新しい失敗から学んだ教訓があれば追加してください。
