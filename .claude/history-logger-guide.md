# スクレイピング履歴ロガー 統合ガイド

## 概要

`scripts/lib/history-logger.js` は、各スクレイパーの実行履歴を自動的に記録し、以下の問題を検出します：

- **動作確認状態**: 1匹以上発見したことがあるか（`verified: true`）
- **エラー発生**: スクレイピング中のエラーを記録
- **数値の不一致**: HTML→YAML→DBで動物数が減少していないか自動検出

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

    // HTML内の動物数をカウント（簡易チェック）
    const animalCount = countAnimalsInHTML(html);
    logger.logHTMLCount(animalCount);

    // ... HTML保存処理 ...
  } catch (error) {
    logger.logError(error);
    throw error;
  } finally {
    // まだ finalize() は呼ばない（html-to-yaml.js で続きを記録）
    await browser?.close();
  }
}

// HTML内の動物数をカウント（簡易実装）
function countAnimalsInHTML(html) {
  // 例: テーブル行数、カード数などをカウント
  const match = html.match(/<tr[^>]*>|<div class="animal-card"/g);
  return match ? match.length : 0;
}
```

**⚠️ 重要**: `logger`は`main()`関数内でのみ使用してください。`fetchWithRetry()`などの他の関数内で`logger`を呼ぶとスコープエラーになります。エラーハンドリングは`main()`の`catch`ブロックで行います。

### 2. html-to-yaml.js（YAML抽出）の修正

```javascript
import { createLogger } from '../../../lib/history-logger.js';

async function main() {
  const logger = createLogger(CONFIG.municipality);

  try {
    // ... HTMLファイル読み込み ...
    // ... 動物データ抽出 ...

    const animals = extractAnimals(html);
    logger.logYAMLCount(animals.length);

    // ⚠️ ここで自動的にHTML→YAMLの不一致をチェック

    // ... YAML保存処理 ...
  } catch (error) {
    logger.logError(error);
    throw error;
  } finally {
    // まだ finalize() は呼ばない（yaml-to-db.js で続きを記録）
  }
}
```

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

## 実装スケジュール

### フェーズ1: 1施設で動作確認

- 千葉市（猫）で統合テスト
- 動作確認後、他施設に展開

### フェーズ2: 全28施設に展開

- 既存の28施設全てに統合
- バッチスクリプトで一括実行して履歴蓄積

### フェーズ3: 新規施設追加時のテンプレート化

- `scraping-guide.md` に統合方法を記載
- コピペ可能なテンプレートを用意

## メリット

1. **動作確認の可視化**: `verified: true` で動作確認済みかすぐわかる
2. **問題の早期発見**: 数値の不一致を自動検出
3. **デバッグ情報の蓄積**: 過去10回分の実行履歴を保持
4. **エラー追跡**: いつ、どのスクレイパーでエラーが発生したか記録
5. **品質管理**: 成功率・不一致率を可視化可能
