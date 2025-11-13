/**
 * HTML保存ロジック
 *
 * kanazawa-dirt-one-spear パターン:
 * - data/html/YYYY/YYYYMMDD/ に保存
 * - 掲載なし → latest_empty.html（上書き）
 * - 掲載あり → archive/YYYYMMDD_HHMMSS_Ncats.html（新規保存）
 */

import fs from 'fs';
import path from 'path';

/**
 * タイムスタンプ生成（YYYYMMDD_HHMMSS形式）- 日本時間（JST）
 *
 * @returns {string} タイムスタンプ
 */
export function generateTimestamp() {
  // 日本時間（JST: UTC+9）でタイムスタンプを生成
  const now = new Date();
  const jstOffset = 9 * 60; // 9時間をミリ秒に変換
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);

  return jstTime.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
}

/**
 * HTMLを保存
 *
 * @param {string} html - 保存するHTML
 * @param {object} options - オプション
 * @param {string} options.municipality - 自治体名（例: 'ishikawa'）
 * @param {number} options.count - 見つかった動物の数
 * @param {string} [options.animalType='cats'] - 動物種別
 * @returns {string} 保存したファイルパス
 */
export function saveHtml(html, options) {
  const { municipality, count, animalType = 'cats' } = options;

  // ディレクトリ構造作成
  const htmlDir = path.join('data', 'html', municipality);

  fs.mkdirSync(htmlDir, { recursive: true });

  let filepath;
  let message;

  if (count === 0) {
    // 掲載なし → latest_empty.html（上書き）
    filepath = path.join(htmlDir, 'latest_empty.html');
    message = '📭 掲載なし - latest_empty.html を上書き';
  } else {
    // 掲載あり → タイムスタンプ付きで保存
    const timestamp = generateTimestamp();
    const filename = `${timestamp}_${animalType}.html`;
    filepath = path.join(htmlDir, filename);
    message = `🐱 掲載あり - ${filename} を保存`;
  }

  // HTML保存
  fs.writeFileSync(filepath, html, 'utf-8');

  return {
    filepath,
    message,
    size: html.length,
  };
}

/**
 * メタデータを保存（JSON）
 *
 * @param {object} metadata - メタデータ
 * @param {string} municipality - 自治体名
 */
export function saveMetadata(metadata, municipality) {
  const htmlDir = path.join('data', 'html', municipality);
  const metadataPath = path.join(htmlDir, 'latest_metadata.json');

  fs.mkdirSync(htmlDir, { recursive: true });
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadataPath;
}

/**
 * 警告付きで静的HTMLを保存（JS必須サイト用）
 *
 * @param {string} html - HTML
 * @param {object} detection - 検出結果
 * @param {string} municipality - 自治体名
 */
export function saveStaticWarning(html, detection, municipality) {
  const htmlDir = path.join('data', 'html', municipality);
  fs.mkdirSync(htmlDir, { recursive: true });

  // 警告付きHTML保存
  const htmlPath = path.join(htmlDir, 'static_EMPTY_WARNING.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // 検出結果保存
  const detectionPath = path.join(htmlDir, 'detection_result.json');
  fs.writeFileSync(detectionPath, JSON.stringify(detection, null, 2), 'utf-8');

  return {
    htmlPath,
    detectionPath,
  };
}
