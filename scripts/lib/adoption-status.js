/**
 * 譲渡済み判定ヘルパー関数
 *
 * 全国の保護施設で共通的に使用される譲渡済みキーワードを検出します。
 * 施設特有の表現がある場合は、個別のhtml-to-yaml.jsで追加判定を行ってください。
 */

/**
 * テキストから譲渡済みかどうかを判定
 * @param {string} text - 判定対象のテキスト
 * @returns {boolean} 譲渡済みの場合true
 */
export function isAdoptedAnimal(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 共通的な譲渡済みキーワード
  const adoptedKeywords = [
    '譲渡済み',
    '譲渡しました',
    '譲渡決定',
    '※譲渡しました', // 沖縄県パターン
    '新しい飼い主さんが決まりました', // 京都府パターン
    '決まりました', // 京都府パターン（短縮版）
    '譲渡先決定',
    '里親決定',
    '引き取られました',
    '飼い主が決まりました',
  ];

  // いずれかのキーワードが含まれているか
  return adoptedKeywords.some((keyword) => text.includes(keyword));
}

/**
 * ステータス文字列を取得
 * @param {string} text - 判定対象のテキスト
 * @returns {'adopted'|'available'} ステータス文字列
 */
export function getAdoptionStatus(text) {
  return isAdoptedAnimal(text) ? 'adopted' : 'available';
}

/**
 * CommonJS互換のためのエクスポート
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isAdoptedAnimal,
    getAdoptionStatus,
  };
}
