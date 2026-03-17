/**
 * スクレイピング履歴ロガー
 *
 * shelters-history.yaml を更新して、各スクレイパーの実行履歴を記録する
 *
 * 使い方:
 *   const logger = new HistoryLogger('chiba/chiba-city-cats');
 *   logger.start();
 *   logger.logHTMLCount(20);
 *   logger.logYAMLCount(18);
 *   logger.logDBCount(15);
 *   logger.finalize(); // shelters-history.yaml を更新
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { getJSTISOString } from './timestamp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(__dirname, '../../data/shelters-history.yaml');

/**
 * スクレイピング履歴ロガー
 */
export class HistoryLogger {
  /**
   * @param {string} municipality - スクレイパーID（例: 'chiba/chiba-city-cats'）
   */
  constructor(municipality) {
    this.municipality = municipality;
    this.startTime = null;
    this.htmlCount = 0;
    this.yamlCount = 0;
    this.dbCount = 0;
    this.error = null;
    this.warnings = [];
  }

  /**
   * 実行開始を記録
   */
  start() {
    this.startTime = Date.now();
    console.log(`📊 [History Logger] ${this.municipality} - 実行開始`);
  }

  /**
   * 前回の実行履歴からカウントを継承
   * html-to-yaml.js や yaml-to-db.js で前のステップの情報を引き継ぐために使用
   */
  loadPreviousCounts() {
    try {
      const historyData = yaml.load(fs.readFileSync(HISTORY_FILE, 'utf8'));
      const scraper = historyData.scrapers?.[this.municipality];

      if (!scraper || !scraper.last_10_runs || scraper.last_10_runs.length === 0) {
        return; // 履歴がない場合は何もしない
      }

      // 最新の実行結果を取得
      const lastRun = scraper.last_10_runs[0];

      // 前回のカウントを継承
      if (lastRun.html_count > 0) {
        this.htmlCount = lastRun.html_count;
        console.log(`📊 [History Logger] 前回のHTML数を継承: ${this.htmlCount}匹`);
      }
      if (lastRun.yaml_count > 0) {
        this.yamlCount = lastRun.yaml_count;
        console.log(`📊 [History Logger] 前回のYAML数を継承: ${this.yamlCount}匹`);
      }
      if (lastRun.db_count > 0) {
        this.dbCount = lastRun.db_count;
        console.log(`📊 [History Logger] 前回のDB数を継承: ${this.dbCount}匹`);
      }
    } catch (error) {
      console.warn(`⚠️  [History Logger] 履歴の読み込みに失敗: ${error.message}`);
    }
  }

  /**
   * HTML内の動物数を記録
   */
  logHTMLCount(count) {
    this.htmlCount = count;
    console.log(`📊 [History Logger] HTML内の動物数: ${count}匹`);
  }

  /**
   * YAML抽出後の動物数を記録
   */
  logYAMLCount(count) {
    this.yamlCount = count;
    console.log(`📊 [History Logger] YAML抽出後の動物数: ${count}匹`);

    // HTML→YAMLで減少していないかチェック
    if (this.htmlCount > 0 && count < this.htmlCount) {
      const diff = this.htmlCount - count;
      const warning = `HTML→YAMLで${diff}匹減少 (${this.htmlCount}→${count})`;
      this.warnings.push(warning);
      console.warn(`⚠️  [History Logger] ${warning}`);
    }
  }

  /**
   * DB投入後の動物数を記録
   */
  logDBCount(count) {
    this.dbCount = count;
    console.log(`📊 [History Logger] DB投入後の動物数: ${count}匹`);

    // YAML→DBで減少していないかチェック
    if (this.yamlCount > 0 && count < this.yamlCount) {
      const diff = this.yamlCount - count;
      const warning = `YAML→DBで${diff}匹減少 (${this.yamlCount}→${count})`;
      this.warnings.push(warning);
      console.warn(`⚠️  [History Logger] ${warning}`);
    }
  }

  /**
   * エラーを記録
   */
  logError(error) {
    this.error = error instanceof Error ? error.message : String(error);
    console.error(`❌ [History Logger] エラー: ${this.error}`);
  }

  /**
   * 実行完了、shelters-history.yaml を更新
   */
  finalize() {
    if (!this.startTime) {
      console.warn('⚠️  [History Logger] start() が呼ばれていません');
      return;
    }

    const duration = Date.now() - this.startTime;
    const timestamp = getJSTISOString();

    // ステータスを判定
    let status = 'success';
    if (this.error) {
      status = 'error';
    } else if (this.warnings.length > 0) {
      status = 'mismatch';
    } else if (this.htmlCount === 0 && this.yamlCount === 0 && this.dbCount === 0) {
      status = 'empty';
    }

    // 実行履歴エントリーを作成
    const runEntry = {
      timestamp,
      status,
      html_count: this.htmlCount,
      yaml_count: this.yamlCount,
      db_count: this.dbCount,
      error_message: this.error || null,
      warning: this.warnings.length > 0 ? this.warnings.join('; ') : null,
      duration_ms: duration,
    };

    // shelters-history.yaml を更新
    this._updateHistoryFile(runEntry);

    console.log(`✅ [History Logger] 実行完了 (${duration}ms) - ステータス: ${status}`);
  }

  /**
   * shelters-history.yaml を更新
   * @private
   */
  _updateHistoryFile(runEntry) {
    try {
      // ファイルを読み込み
      const historyData = yaml.load(fs.readFileSync(HISTORY_FILE, 'utf8'));

      // スクレイパーのエントリーを取得または新規作成
      if (!historyData.scrapers[this.municipality]) {
        console.log(
          `📝 [History Logger] ${this.municipality} を shelters-history.yaml に新規追加します`
        );

        // 新規エントリーを作成
        historyData.scrapers[this.municipality] = {
          name: null, // 施設名は手動で追加される
          page_type: null,
          verified: false,
          last_success: null,
          last_error: null,
          last_error_message: null,
          total_runs: 0,
          success_count: 0,
          error_count: 0,
          mismatch_count: 0,
          last_10_runs: [],
        };

        // total_scrapers を更新
        historyData.metadata.total_scrapers = Object.keys(historyData.scrapers).length;
      }

      const scraper = historyData.scrapers[this.municipality];

      // 統計を更新
      scraper.total_runs = (scraper.total_runs || 0) + 1;

      if (runEntry.status === 'success' || runEntry.status === 'empty') {
        scraper.success_count = (scraper.success_count || 0) + 1;
        scraper.last_success = runEntry.timestamp;

        // 1匹以上見つかったら verified: true
        if (runEntry.html_count > 0 || runEntry.yaml_count > 0 || runEntry.db_count > 0) {
          scraper.verified = true;
        }
      }

      if (runEntry.status === 'error') {
        scraper.error_count = (scraper.error_count || 0) + 1;
        scraper.last_error = runEntry.timestamp;
        scraper.last_error_message = runEntry.error_message;
      }

      if (runEntry.status === 'mismatch') {
        scraper.mismatch_count = (scraper.mismatch_count || 0) + 1;
      }

      // last_10_runs を更新（最新10件のみ保持）
      scraper.last_10_runs = scraper.last_10_runs || [];
      scraper.last_10_runs.unshift(runEntry); // 先頭に追加
      if (scraper.last_10_runs.length > 10) {
        scraper.last_10_runs = scraper.last_10_runs.slice(0, 10); // 最新10件のみ
      }

      // メタデータを更新
      historyData.metadata.last_updated = getJSTISOString();

      // ファイルに書き込み
      const yamlStr = yaml.dump(historyData, {
        lineWidth: -1, // 行の折り返しを無効化
        noRefs: true, // 参照を使わない
      });
      fs.writeFileSync(HISTORY_FILE, yamlStr, 'utf8');

      console.log(`📝 [History Logger] shelters-history.yaml を更新しました`);
    } catch (error) {
      console.error(`❌ [History Logger] shelters-history.yaml の更新に失敗:`, error.message);
    }
  }
}

/**
 * 簡易ラッパー関数
 */
export function createLogger(municipality) {
  return new HistoryLogger(municipality);
}
