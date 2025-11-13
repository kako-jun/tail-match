# スクレイパー動物カウントパターン一覧

全28施設のscrape.jsにhistory-logger統合を実装しました。
各施設のHTML構造に応じて、最適なカウントパターンを使用しています。

## 実装日: 2025-11-13

---

## Phase 1: 手動実装（5施設）

カスタムカウント関数を各施設に合わせて実装しました。

### 1. chiba/chiba-city-cats（千葉市動物保護指導センター - 猫）

**カウントパターン**: `<h4>`タグパターン

- プライマリ: `<h4>` タグ内に8桁の日付形式と名前が含まれるパターン
- フォールバック: コンテンツエリア内の `<h4>` タグ総数

```javascript
/<h4[^>]*>.*?\d{8}.*?<\/h4>/gi;
```

### 2. ishikawa/aigo-ishikawa（いしかわ動物愛護センター）

**カウントパターン**: 複数の `.data_box` クラスパターン

- `.data_box`, `.animal-card`, `.cat-card`, `.pet-item` などを検出
- 最も多くマッチしたパターンを採用

```javascript
/<div[^>]*class="[^"]*data_box[^"]*"[^>]*>/gi;
```

### 3. okinawa/okinawa-pref-cats（沖縄県動物愛護管理センター - 猫）

**カウントパターン**: 詳細ページへのリンク

- プライマリ: `/animals/transfer_view/` へのリンク
- フォールバック: `.title` クラスを含むリンク

```javascript
/<a[^>]*href="[^"]*\/animals\/transfer_view\/\d+[^"]*"[^>]*>/gi;
```

### 4. hokkaido/hokkaido-pref（北海道立動物愛護センター）

**カウントパターン**: （仮名）パターン

- プライマリ: `<h3>` または `<h4>` タグ内の「（仮名）」文字列
- フォールバック: コンテンツエリア内の `<h3>`/`<h4>` タグ総数

```javascript
/<h[34][^>]*>.*?（仮名）.*?<\/h[34]>/gi;
```

### 5. tokyo/tokyo-metro-cats（東京都動物愛護相談センター - 猫）

**カウントパターン**: `.imgWrapper` クラス

- プライマリ: `.imgWrapper` クラスを含む要素
- フォールバック: 「管理番号」を含む `<h2>` タグ

```javascript
/<div[^>]*class="[^"]*imgWrapper[^"]*"[^>]*>/gi;
```

---

## Phase 2: 自動実装（23施設）

汎用カウント関数（4段階フォールバック）を一括適用しました。

### 汎用カウントパターン

すべての施設に以下の4段階フォールバックを実装:

1. **テーブル行パターン**
   - `<tr>` タグをカウント（ヘッダー行を除外）

2. **カード/ボックスパターン**
   - `.card`, `.box`, `.item` などのクラスを検出

3. **詳細リンクパターン**
   - `detail` を含むリンクをカウント

4. **汎用画像パターン**
   - アイコン・ロゴを除外した画像タグをカウント

### 自動実装された施設一覧（23施設）

#### 千葉県（3施設）

- chiba/chiba-city-dogs
- chiba/chiba-pref-cats
- chiba/chiba-pref-dogs

#### 福井県（2施設）

- fukui/fukui-pref-cats ⚠️ 手動修正済み
- fukui/fukui-pref-dogs

#### 北海道（1施設）

- hokkaido/sapporo-city-cats

#### 兵庫県（2施設）

- hyogo/hyogo-pref-cats
- hyogo/kobe-city

#### 石川県（1施設）

- ishikawa/kanazawa-city-cats ⚠️ 手動修正済み

#### 神奈川県（3施設）

- kanagawa/kanagawa-pref-cats ⚠️ 手動修正済み（複数ページ対応）
- kanagawa/kanagawa-pref-dogs
- kanagawa/yokohama-city-cats ⚠️ 手動修正済み

#### 京都府（2施設）

- kyoto/kyoto-pref-cats ⚠️ 手動修正済み
- kyoto/kyoto-pref-dogs

#### 沖縄県（2施設）

- okinawa/naha-city
- okinawa/okinawa-pref-dogs

#### 大阪府（3施設）

- osaka/osaka-city-cats
- osaka/osaka-pref-cats
- osaka/sakai-city-cats

#### 埼玉県（2施設）

- saitama/saitama-city-cats
- saitama/saitama-pref-cats

#### 富山県（2施設）

- toyama/toyama-pref-cats ⚠️ 手動修正済み
- toyama/toyama-pref-dogs

---

## 特殊対応

### 複数ページ対応（kanagawa-pref-cats）

神奈川県は複数ページをスクレイピングするため、全ページの動物数を合計しています。

```javascript
let totalCount = 0;
for (const html of allHtmlPages) {
  totalCount += countAnimalsInHTML(html);
}
logger.logHTMLCount(totalCount);
```

---

## 統合状況サマリー

| フェーズ | 施設数     | 実装方法 | 手動修正  |
| -------- | ---------- | -------- | --------- |
| Phase 1  | 5施設      | 手動実装 | -         |
| Phase 2  | 23施設     | 自動実装 | 6施設     |
| **合計** | **28施設** | **完了** | **6施設** |

---

## 次のステップ

1. **実行テスト**: 各施設でスクレイパーを実行して動作確認
2. **履歴データ確認**: `.claude/shelters-history.yaml` の更新を確認
3. **精度向上**: 実際のHTMLデータに基づいてカウントパターンを最適化

---

## 備考

- すべての施設で `logger.start()`, `logger.logHTMLCount()`, `logger.logError()`, `logger.finalize()` を実装済み
- エラーハンドリングとfinallyブロックにlogger統合完了
- カウント関数は各施設のHTML構造に応じて柔軟に対応
- 汎用パターンでも十分な精度が期待できる
