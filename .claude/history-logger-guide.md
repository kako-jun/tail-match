# スクレイピング履歴ロガー 統合ガイド

## 概要

`scripts/lib/history-logger.js` は、各スクレイパーの実行履歴を自動的に記録し、以下の問題を検出します：

- **動作確認状態**: 1匹以上発見したことがあるか（`verified: true`）
- **エラー発生**: スクレイピング中のエラーを記録
- **数値の不一致**: HTML→YAML→DBで動物数が減少していないか自動検出
- **カウント継承**: 前ステップの数値を継承して不一致を即座に検出

**統合状況（2025-11-13）**: ✅ 全28施設統合完了

## 統合方法

### 1. scrape.js（HTML収集）の修正

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  try {
    // ... HTML収集処理 ...

    const html = await page.content();

    // HTML内の動物数をカウント
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // ... HTML保存処理 ...

    logger.finalize(); // ✅ scrape.js で finalize() を呼ぶ
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // ✅ エラー時も呼ぶ
    throw error;
  } finally {
    await browser?.close();
  }
}

// HTML内の動物数をカウント（汎用実装）
function countAnimalsInHTML(html) {
  // パターン1: テーブル行をカウント
  const tableRows = html.match(/<tr[^>]*>/gi);
  if (tableRows && tableRows.length > 1) {
    return tableRows.length - 1; // ヘッダー行を除く
  }

  // パターン2: カード/ボックス形式をカウント
  const cardPatterns = [
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>/gi,
    /<div[^>]*class="[^"]*box[^"]*"[^>]*>/gi,
    /<article[^>]*>/gi,
  ];

  for (const pattern of cardPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  }

  // パターン3: 詳細リンクをカウント
  const linkPattern = /<a[^>]*href="[^"]*detail[^"]*"[^>]*>/gi;
  const linkMatches = html.match(linkPattern);
  if (linkMatches) {
    return linkMatches.length;
  }

  return 0;
}
```

**⚠️ 重要事項**:

1. **logger は main() 内でのみ使用** - fetchWithRetry() などで呼ぶとスコープエラー
2. **countAnimalsInHTML() 関数定義を忘れない** - logHTMLCount() を呼ぶ前に必ず定義
3. **finalize() を必ず呼ぶ** - 正常時も catch ブロックでも

### 2. html-to-yaml.js（YAML抽出）の修正

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // ✅ 前ステップの数値を継承

  try {
    // ... HTMLファイル読み込み ...
    // ... 動物データ抽出 ...

    const allCats = extractAnimals(html); // または allDogs
    logger.logYAMLCount(allCats.length); // ⚠️ 変数名注意！

    // ⚠️ ここで自動的にHTML→YAMLの不一致をチェック

    // ... YAML保存処理 ...

    logger.finalize(); // ✅ html-to-yaml.js で finalize() を呼ぶ
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // ✅ エラー時も呼ぶ
    throw error;
  }
}
```

**⚠️ 重要事項**:

1. **loadPreviousCounts() を呼ぶ** - 前ステップ（scrape.js）の HTML count を継承
2. **変数名を確認** - allCats/allDogs/allAnimals のいずれか、間違えない
3. **finalize() を必ず呼ぶ** - 正常時も catch ブロックでも

### 3. yaml-to-db.js（DB投入）の修正

```javascript
import { createLogger } from './lib/history-logger.js';

async function main() {
  // 各スクレイパーごとにロガーを作成
  for (const config of CONFIG.municipalities) {
    const logger = createLogger(config.municipality);

    try {
      // ... YAML読み込み ...
      // ... DB投入処理 ...

      const insertedCount = insertAnimalsToDatabase(animals);
      logger.logDBCount(insertedCount);

      // ⚠️ ここで自動的にYAML→DBの不一致をチェック

      // ✅ 最終的に finalize() を呼んで shelters-history.yaml を更新
      logger.finalize();
    } catch (error) {
      logger.logError(error);
      logger.finalize(); // エラーでも履歴を記録
    }
  }
}
```

## 自動検出される問題

### 1. 数値の不一致

```
⚠️  [History Logger] HTML→YAMLで2匹減少 (20→18)
⚠️  [History Logger] YAML→DBで3匹減少 (18→15)
```

→ `shelters-history.yaml` に以下のように記録されます：

```yaml
chiba/chiba-city-cats:
  last_10_runs:
    - timestamp: '2025-11-13T10:30:00+09:00'
      status: 'mismatch' # ⚠️ 不一致を検出
      html_count: 20
      yaml_count: 18
      db_count: 15
      warning: 'HTML→YAMLで2匹減少 (20→18); YAML→DBで3匹減少 (18→15)'
```

### 2. エラー発生

```
❌ [History Logger] エラー: Connection timeout
```

→ 以下のように記録されます：

```yaml
chiba/chiba-city-cats:
  last_error: '2025-11-13T11:00:00+09:00'
  last_error_message: 'Connection timeout'
  error_count: 1
  last_10_runs:
    - timestamp: '2025-11-13T11:00:00+09:00'
      status: 'error' # ❌ エラーを検出
      error_message: 'Connection timeout'
```

### 3. 動作確認完了

```
✅ [History Logger] 実行完了 (3500ms) - ステータス: success
```

→ 1匹以上見つかった場合、`verified: true` に自動更新されます：

```yaml
chiba/chiba-city-cats:
  verified: true # ✅ 動作確認完了
  last_success: '2025-11-13T10:30:00+09:00'
  success_count: 1
```

## 実装状況

### ✅ フェーズ1: 1施設で動作確認（完了）

- 千葉市（猫）で統合テスト完了
- 括弧パターン問題を発見・修正

### ✅ フェーズ2: 全28施設に展開（完了）

- 全28施設に統合完了（2025-11-13）
- エラーゼロ達成、成功率79%
- 12施設でエラー発見→全修正完了

### ✅ フェーズ3: テンプレート化（完了）

- `scraping-guide.md` に統合方法を記載済み
- `common-mistakes.md` にエラーパターン追加済み
- 自動修正ツール完備（fix-missing-count-function.js）

## メリット

1. **動作確認の可視化**: `verified: true` で動作確認済みかすぐわかる
2. **問題の早期発見**: 数値の不一致を自動検出
3. **デバッグ情報の蓄積**: 過去10回分の実行履歴を保持
4. **エラー追跡**: いつ、どのスクレイパーでエラーが発生したか記録
5. **品質管理**: 成功率・不一致率を可視化可能
