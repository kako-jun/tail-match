/**
 * 動物種判定ヘルパー関数
 *
 * 犬猫混在ページで動物種を自動判定します。
 * 様々な表記（漢字・カタカナ・ひらがな・愛称）に対応します。
 */

/**
 * テキストから動物種を判定
 * @param {string} text - 判定対象のテキスト
 * @param {string} defaultType - デフォルトの動物種（'cat' | 'dog' | 'unknown'）
 * @returns {'cat'|'dog'|'unknown'} 動物種
 */
export function determineAnimalType(text, defaultType = 'unknown') {
  if (!text || typeof text !== 'string') {
    return defaultType;
  }

  // 大文字小文字を区別しない正規表現パターン
  const DOG_PATTERN = /犬|イヌ|いぬ|ワンちゃん|わんちゃん|ワンコ|わんこ|dog|Dog|DOG/;
  const CAT_PATTERN = /猫|ネコ|ねこ|ニャンちゃん|にゃんちゃん|ニャンコ|にゃんこ|cat|Cat|CAT/;

  // 犬のキーワードが含まれているか
  if (DOG_PATTERN.test(text)) {
    return 'dog';
  }

  // 猫のキーワードが含まれているか
  if (CAT_PATTERN.test(text)) {
    return 'cat';
  }

  // どちらも検出されない場合はデフォルト値
  return defaultType;
}

/**
 * 犬かどうかを判定
 * @param {string} text - 判定対象のテキスト
 * @returns {boolean} 犬の場合true
 */
export function isDog(text) {
  return determineAnimalType(text) === 'dog';
}

/**
 * 猫かどうかを判定
 * @param {string} text - 判定対象のテキスト
 * @returns {boolean} 猫の場合true
 */
export function isCat(text) {
  return determineAnimalType(text) === 'cat';
}

/**
 * セクションヘッダーから動物種を判定（那覇市パターン用）
 * @param {string} headerText - セクションヘッダーのテキスト
 * @param {string} defaultType - デフォルトの動物種
 * @returns {'cat'|'dog'|'unknown'} 動物種
 */
export function determineAnimalTypeFromHeader(headerText, defaultType = 'unknown') {
  if (!headerText || typeof headerText !== 'string') {
    return defaultType;
  }

  // ヘッダー特有のパターン（「譲渡犬紹介」「譲渡猫紹介」など）
  if (/譲渡犬|保護犬|収容犬|犬の紹介|犬紹介/.test(headerText)) {
    return 'dog';
  }

  if (/譲渡猫|保護猫|収容猫|猫の紹介|猫紹介/.test(headerText)) {
    return 'cat';
  }

  // 通常の判定にフォールバック
  return determineAnimalType(headerText, defaultType);
}

/**
 * CommonJS互換のためのエクスポート
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    determineAnimalType,
    isDog,
    isCat,
    determineAnimalTypeFromHeader,
  };
}
