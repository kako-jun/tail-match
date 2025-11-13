/**
 * タイムスタンプ生成ユーティリティ
 *
 * すべてのスクレイパーで使用する統一されたタイムスタンプ生成関数
 * 日本時間（JST = UTC+9）で生成
 */

/**
 * 日本時間（JST）のタイムスタンプを生成
 *
 * @returns {string} YYYYMMDD_HHMMSS 形式のタイムスタンプ
 *
 * @example
 * const timestamp = getJSTTimestamp();
 * // => "20251112_163045"
 */
export function getJSTTimestamp() {
  const now = new Date();

  // 日本時間（UTC+9）に変換
  const jstOffset = 9 * 60; // 9時間 = 540分
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);

  // YYYYMMDD_HHMMSS 形式に整形
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  const hour = String(jstTime.getUTCHours()).padStart(2, '0');
  const minute = String(jstTime.getUTCMinutes()).padStart(2, '0');
  const second = String(jstTime.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hour}${minute}${second}`;
}

/**
 * 日本時間（JST）のISO 8601文字列を生成
 *
 * @returns {string} ISO 8601形式の日本時間文字列
 *
 * @example
 * const isoTimestamp = getJSTISOString();
 * // => "2025-11-12T16:30:45+09:00"
 */
export function getJSTISOString() {
  const now = new Date();

  // 日本時間（UTC+9）に変換
  const jstOffset = 9 * 60; // 9時間 = 540分
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);

  // ISO 8601形式に整形（タイムゾーンオフセット付き）
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  const hour = String(jstTime.getUTCHours()).padStart(2, '0');
  const minute = String(jstTime.getUTCMinutes()).padStart(2, '0');
  const second = String(jstTime.getUTCSeconds()).padStart(2, '0');
  const ms = String(jstTime.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}+09:00`;
}

/**
 * レガシータイムスタンプをJSTタイムスタンプに変換
 * （既存のUTCタイムスタンプを持つファイルを変換する際に使用）
 *
 * @param {string} legacyTimestamp - YYYYMMDD_HHMMSS 形式のUTCタイムスタンプ
 * @returns {string} YYYYMMDD_HHMMSS 形式のJSTタイムスタンプ
 *
 * @example
 * const jstTimestamp = convertLegacyTimestampToJST("20251112_050457");
 * // => "20251112_140457" (UTC 05:04:57 → JST 14:04:57)
 */
export function convertLegacyTimestampToJST(legacyTimestamp) {
  // YYYYMMDD_HHMMSS を Date オブジェクトに変換（UTC として解釈）
  const match = legacyTimestamp.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid timestamp format: ${legacyTimestamp}`);
  }

  const [, year, month, day, hour, minute, second] = match;
  const utcDate = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    )
  );

  // 日本時間に変換
  const jstOffset = 9 * 60; // 9時間 = 540分
  const jstTime = new Date(utcDate.getTime() + jstOffset * 60 * 1000);

  // YYYYMMDD_HHMMSS 形式に整形
  const jstYear = jstTime.getUTCFullYear();
  const jstMonth = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const jstDay = String(jstTime.getUTCDate()).padStart(2, '0');
  const jstHour = String(jstTime.getUTCHours()).padStart(2, '0');
  const jstMinute = String(jstTime.getUTCMinutes()).padStart(2, '0');
  const jstSecond = String(jstTime.getUTCSeconds()).padStart(2, '0');

  return `${jstYear}${jstMonth}${jstDay}_${jstHour}${jstMinute}${jstSecond}`;
}
