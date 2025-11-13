# よくある間違いと学んだ教訓

このファイルは過去の失敗から学んだ教訓をまとめたものです。新規自治体を追加する際は必ず参照してください。

## 📚 関連ドキュメント

- **[scraping-guide.md](./scraping-guide.md)** - 新規自治体追加の完全な手順書
- **[scraping-architecture.md](./scraping-architecture.md)** - アーキテクチャ設計思想
- **[CLAUDE.md](../CLAUDE.md)** - プロジェクト全体の状況管理

> 💡 **ヒント**: このドキュメントは「やってはいけないこと」を記載しています。「やるべきこと」は [scraping-guide.md](./scraping-guide.md) を参照してください。

---

## ⚠️ よくある間違い（やってはいけないこと）

### ❌ 1. `scraper-python-backup` を使おうとする

- **このフォルダは凍結されたバックアップです**
- 現在のスクレイパーは **Node.js** ベース（`scripts/scrapers/`）

### ❌ 2. `archive` ディレクトリを作ろうとする

- HTMLファイルと `latest_metadata.json` は**同じ階層**に並べる
- ❌ `data/html/ishikawa/aigo-ishikawa/archive/20251112_tail.html`
- ✅ `data/html/ishikawa/aigo-ishikawa/20251112_tail.html`

### ❌ 3. 都道府県階層を省略する

- 都道府県名（例: `ishikawa`）の階層は**必須**
- ❌ `data/html/kanazawa-city/`
- ✅ `data/html/ishikawa/kanazawa-city/`

### ❌ 4. municipality設定を間違える

- municipality は**パス形式**で指定する
- ❌ `municipality: 'kanazawa-city'`
- ✅ `municipality: 'ishikawa/kanazawa-city'`

### ❌ 5. いちいちスクリプトで処理する

- ファイル移動などは直接コマンドを提案する
- スクリプトファイルを作成しない

### ❌ 6. `.claude/shelters/`を確認せずに進める

- **新規自治体追加時は必ず** `.claude/shelters/` のYAMLを最初に確認
- URLや連絡先情報が既に登録されている
- Web検索せずにまずローカルの情報を確認する

### ❌ 7. YAML出力時にmetaセクションを忘れる

- `yaml.dump()` の構造に**必ず `meta:` セクション**を含める
- ❌ トップレベルに `municipality`, `source_url` を配置
- ✅ `meta` オブジェクト内に配置

### ❌ 8. yaml-to-db.js の municipalities 配列に追加し忘れる

- 新規自治体を追加したら**必ず `CONFIG.municipalities` に追加**
- 追加しないとDB投入時にスキップされる
- Step 7の最終チェックリストで確認

---

## 📝 チェックリスト

新規自治体を追加する際は、以下を確認してください：

### 実装前

- [ ] 対象URLを確認した
- [ ] HTMLサンプルを取得した
- [ ] セレクタを調査した
- [ ] JavaScript必須か確認した

### 実装中

- [ ] municipality をパス形式で設定した（例: `'ishikawa/kanazawa-city'`）
- [ ] htmlDir に archive を含めていない
- [ ] セレクタを実際のHTMLに合わせた
- [ ] 画像取得のDOM構造を確認した
- [ ] 共通ヘルパー関数をインポートした（`getAdoptionStatus`, `determineAnimalType`）
- [ ] 譲渡済み判定に `getAdoptionStatus()` を使用した
- [ ] 犬猫混在ページの場合、`determineAnimalType()` を使用した

### 実装後

- [ ] HTML収集が成功した（ファイルサイズ確認）
- [ ] YAML抽出が成功した（動物が抽出された）
- [ ] animal_type が正しく設定されている（'cat' または 'dog'）
- [ ] status が正しく設定されている（'available', 'adopted', 'removed'）
- [ ] 犬用ページの存在確認を実施した
- [ ] 画像URLが空でない
- [ ] 信頼度が HIGH または MEDIUM
- [ ] README を作成した
- [ ] yaml-to-db.js に追加した

---

## 🎓 学んだ教訓

### 金沢市追加時

1. **archiveディレクトリは不要** - HTMLとmetadata.jsonは同じ階層
2. **都道府県階層は必須** - `ishikawa/` を省略してはいけない
3. **municipalityはパス形式** - `'ishikawa/kanazawa-city'` のように指定
4. **セレクタは緩く** - 中間要素（table-wrapperなど）を考慮する
5. **画像はDOM構造を確認** - `.closest()` や `.prev()` の対象を正確に
6. **直接コマンド実行** - ファイル移動などでスクリプトを作らない

### 那覇市・犬用ページ発見時（2025-11-12）

7. **犬も対象であることを忘れない** - プロジェクトは猫専用ではない
8. **犬用ページの存在確認は必須** - cat.html → dog.html のパターンが多い
9. **animal_type を明示的に設定** - 'cat' または 'dog' をハードコードしない
10. **status フィールドも必須** - 譲渡済み情報（available/adopted/removed）を抽出
11. **7施設で犬用ページを見逃していた** - 横断的なURL確認の重要性

### 共通ヘルパー関数導入時（2025-11-13）

12. **共通ロジックは必ず関数化する** - 全28施設で同じ判定ロジックを書かない
13. **「ワンちゃん」「わんちゃん」などの愛称表記を忘れない** - カタカナ・ひらがな・漢字すべてカバー
14. **譲渡済みキーワードは包括的に** - 施設ごとの表現の違いを吸収する
15. **共通関数は scripts/lib/ に配置** - 全スクレイパーからアクセス可能
16. **新規追加時は必ず共通関数を使用** - 手動判定を書かない

**共通化のメリット**:

- **一貫性**: 全施設で同じ検出精度
- **保守性**: キーワード追加は2ファイルのみ
- **品質**: ユニットテスト可能
- **拡張性**: 新しい動物種の追加が容易

### 命名規則統一時（2025-11-13）

17. **猫専用ページには `-cats` サフィックスを付ける** - 犬用ページとの統一感
18. **混在ページにはサフィックスを付けない** - 明確な区別
19. **命名規則は一貫性が最重要** - 将来の保守性に直結
20. **ディレクトリ名とmunicipality設定は必ず一致させる** - データの整合性を保つ

**命名規則の重要性**:

- **可読性**: 一目でページ種別が分かる
- **保守性**: 新規追加時の判断が容易
- **拡張性**: 将来の動物種追加に対応可能

---

## 🛡️ ベストプラクティス

### データ品質

1. **個体識別子の重複防止**
   - 1つの管理番号に複数の個体がある場合、サフィックスで一意化
   - external_id生成ロジックに重複防止を組み込む
   - DRY-RUNで必ず制約違反がないことを確認

2. **デフォルト名の生成**
   - 名前がない場合は「保護猫XXX号」などを自動生成
   - external_idから番号を抽出して使用

3. **メタデータの完全性**
   - YAML出力時に必ず `meta:` セクションを含める
   - `source_file`, `source_url`, `extracted_at`, `municipality` を設定

### コード品質

1. **共通関数の活用**
   - 譲渡済み判定: `getAdoptionStatus()`
   - 動物種判定: `determineAnimalType()`
   - タイムスタンプ生成: `getJSTTimestamp()`, `getJSTISOString()`

2. **タイムゾーン統一**
   - 必ず日本時間（JST）を使用
   - `new Date().toISOString()` ではなく `getJSTISOString()` を使う

3. **パス形式の統一**
   - municipality は必ず `{prefecture}/{municipality}` 形式
   - サフィックスも忘れずに（-cats, -dogs）

### 実装フロー

1. **事前調査を徹底**
   - `.claude/shelters/` の情報を必ず確認
   - 犬用ページの存在確認も忘れずに
   - HTMLサンプルを取得してセレクタを検証

2. **段階的テスト**
   - HTML収集 → YAML抽出 → DRY-RUN → DB投入
   - 各ステップで結果を確認してから次へ

3. **最終チェックリスト活用**
   - YAML構造チェック
   - yaml-to-db.js への追加確認
   - import paths の確認
   - municipality パス形式の確認
   - 共通関数の使用確認

---

このドキュメントは、同じミスを繰り返さないための記録です。新しい失敗から学んだ教訓があれば、このファイルに追加してください。
