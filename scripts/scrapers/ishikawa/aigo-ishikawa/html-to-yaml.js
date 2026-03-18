#!/usr/bin/env node

/**
 * いしかわ動物愛護センター HTML → YAML パーサー
 *
 * 目的：保存されたHTMLファイルからYAMLデータを生成
 * 利点：
 * - 人間が確認・編集可能
 * - バージョン管理しやすい
 * - DB投入前の品質チェックが可能
 * - 誤ったデータの修正が簡単
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { determineAnimalType as determineAnimalTypeHelper } from '../../../lib/animal-type.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ishikawa/aigo-ishikawa',
  municipalityId: 1,
  htmlDir: 'data/html/ishikawa/aigo-ishikawa',
  yamlOutputDir: 'data/yaml/ishikawa/aigo-ishikawa',

  // 抽出ルール
  selectors: {
    containers: '.data_box, .animal-card, .pet-item, .animal-info, .cat-item',
    name: '.name, .pet-name, h3, h4, .title',
    details: '.details, .pet-details, .info, .description',
    image: 'img',
  },

  // 正規表現パターン
  patterns: {
    gender: /(?:オス|雄|♂|male)|(?:メス|雌|♀|female)/i,
    age: /(?:生後|約)?(\d+)(?:歳|才|ヶ月|か月|ヵ月)|(?:子猫|成猫|シニア)/i,
    color: /(?:白|黒|茶|灰|三毛|みけ|キジ|サビ|茶白|白黒|グレー|クリーム)/i,
    id: /No\.?\s*(\d+)|ID[\s:]*(\d+)|管理番号[\s:]*(\d+)/i,
  },
};

// ========================================
// HTML解析関数
// ========================================

/**
 * HTMLファイルから動物データを抽出してYAML形式で出力
 */
function extractAnimalsFromHTML(html, sourceUrl, htmlFilename) {
  const $ = load(html);
  const animals = [];

  console.log('🔍 HTML解析開始...');

  // メタデータ
  const extractionMeta = {
    source_file: htmlFilename,
    source_url: sourceUrl,
    extracted_at: getJSTISOString(),
    municipality: CONFIG.municipality,
    municipality_id: CONFIG.municipalityId,
  };

  // データコンテナを検索
  const containers = $(CONFIG.selectors.containers);
  console.log(`   コンテナ発見: ${containers.length}個`);

  if (containers.length === 0) {
    // フォールバック: 猫関連テキストを含む要素を探す
    console.log('   フォールバック解析を実行...');
    const fallbackAnimals = extractAnimalsFromText($, sourceUrl);
    animals.push(...fallbackAnimals);
  } else {
    // 各コンテナから動物データを抽出
    containers.each((index, container) => {
      const $container = $(container);

      try {
        const animal = extractAnimalFromContainer($container, index + 1, sourceUrl, $);
        if (animal) {
          animals.push(animal);
          console.log(
            `   動物 ${index + 1}: ${animal.name || '名前不明'} (${animal.gender || '性別不明'})`
          );
        }
      } catch (error) {
        console.warn(`   コンテナ ${index + 1} の解析エラー:`, error.message);

        // エラー詳細をYAMLに記録
        animals.push({
          extraction_error: true,
          error_message: error.message,
          container_index: index + 1,
          container_html: $container.html()?.substring(0, 200) + '...',
        });
      }
    });
  }

  console.log(`✅ 抽出完了: ${animals.length}個のエントリ`);

  // クロスチェック用の統計情報を収集
  const bodyText = $('body').text();
  const crossCheck = {
    gender_mentions: (bodyText.match(/オス|メス|♂|♀/g) || []).length,
    age_mentions: (bodyText.match(/推定年齢|生後|歳|ヶ月|か月/g) || []).length,
    breed_mentions: (
      bodyText.match(/トイプードル|ミニチュアダックス|柴犬|雑種|ミックス|日本猫/g) || []
    ).length,
    image_tags: $('img').length,
    animal_keywords: {
      cat: (bodyText.match(/猫|ネコ|ねこ/g) || []).length,
      dog: (bodyText.match(/犬|イヌ|いぬ/g) || []).length,
    },
  };

  // 整合性チェック
  const validAnimalCount = animals.filter((a) => !a.extraction_error).length;
  const consistencyWarnings = [];

  if (Math.abs(validAnimalCount - crossCheck.gender_mentions) > 2) {
    consistencyWarnings.push(
      `性別表記(${crossCheck.gender_mentions})と抽出数(${validAnimalCount})に${Math.abs(validAnimalCount - crossCheck.gender_mentions)}個の差異`
    );
  }

  if (crossCheck.age_mentions > validAnimalCount * 1.5) {
    consistencyWarnings.push(
      `年齢表記(${crossCheck.age_mentions})が抽出数より大幅に多い - 取りこぼしの可能性`
    );
  }

  if (validAnimalCount > 0 && crossCheck.image_tags < validAnimalCount * 0.5) {
    consistencyWarnings.push(
      `画像数(${crossCheck.image_tags})が少なすぎる - HTML構造の問題の可能性`
    );
  }

  // 信頼度レベルの判定
  let confidenceLevel = 'high';
  if (consistencyWarnings.length > 0) {
    confidenceLevel = consistencyWarnings.length === 1 ? 'medium' : 'low';
  }
  if (consistencyWarnings.length >= 3) {
    confidenceLevel = 'critical';
  }

  console.log('\n📊 クロスチェック結果:');
  console.log(`   性別表記: ${crossCheck.gender_mentions}個`);
  console.log(`   年齢表記: ${crossCheck.age_mentions}個`);
  console.log(`   犬種表記: ${crossCheck.breed_mentions}個`);
  console.log(`   画像タグ: ${crossCheck.image_tags}個`);
  console.log(`   猫キーワード: ${crossCheck.animal_keywords.cat}個`);
  console.log(`   犬キーワード: ${crossCheck.animal_keywords.dog}個`);

  if (consistencyWarnings.length > 0) {
    console.log('\n⚠️  整合性の警告:');
    consistencyWarnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  console.log(`\n🎯 信頼度レベル: ${confidenceLevel.toUpperCase()}`);
  if (confidenceLevel === 'critical') {
    console.log('   ⚠️ CRITICAL: 手動確認を強く推奨します');
  } else if (confidenceLevel === 'low') {
    console.log('   ⚠️ LOW: 手動確認を推奨します');
  } else if (confidenceLevel === 'medium') {
    console.log('   ✓ MEDIUM: 問題ない可能性が高いですが確認推奨');
  } else {
    console.log('   ✓ HIGH: 問題なし');
  }

  return {
    meta: extractionMeta,
    animals: animals,
    statistics: {
      total_containers: containers.length,
      valid_animals: validAnimalCount,
      extraction_errors: animals.filter((a) => a.extraction_error).length,
    },
    cross_check: crossCheck,
    consistency_warnings: consistencyWarnings,
    confidence_level: confidenceLevel,
  };
}

/**
 * 個別コンテナから動物データを抽出
 */
function extractAnimalFromContainer($container, index, sourceUrl, $) {
  const text = $container.text();

  // raw_textから優先的に抽出（より正確）
  const nameFromRaw = extractNameFromRawText(text);
  const breedFromRaw = extractBreedFromRawText(text);
  const ageFromRaw = extractAgeFromRawText(text);
  const colorFromRaw = extractColorFromRawText(text);

  // フォールバック: セレクタベース抽出
  const name = nameFromRaw || extractName($container, $) || `保護動物${index}号`;
  const externalId = extractExternalId(text) || `ishikawa_${Date.now()}_${index}`;
  const gender = extractGender(text);
  const age = ageFromRaw || extractAge(text);
  const color = colorFromRaw || extractColor(text);
  const breed = breedFromRaw || extractBreed(text) || 'ミックス';

  // 画像URL抽出
  const images = [];
  $container.find('img').each((i, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';
    if (src) {
      // 相対URLを絶対URLに変換
      const imageUrl = src.startsWith('http')
        ? src
        : `https://aigo-ishikawa.jp${src.startsWith('/') ? '' : '/'}${src}`;
      images.push({
        url: imageUrl,
        alt: alt,
        original_src: src,
      });
    }
  });

  // より詳細な情報抽出
  const healthInfo = extractHealthInfo(text);
  const personality = extractPersonality(text);
  const specialNeeds = extractSpecialNeeds(text);

  return {
    // 基本情報
    external_id: externalId,
    animal_type: determineAnimalType(text), // cat, dog, other
    name: name,
    breed: breed,

    // 身体的特徴
    age_estimate: age,
    gender: normalizeGender(gender),
    color: color,
    size: extractSize(text) || 'medium',

    // 健康・性格
    health_status: healthInfo,
    personality: personality,
    special_needs: specialNeeds,

    // メディア
    images: images,

    // 日付情報
    protection_date: extractDate(text, 'protection'),
    deadline_date: extractDate(text, 'deadline'),

    // ステータス（譲渡済み判定）
    status: getAdoptionStatus(text),
    transfer_decided: false,

    // メタデータ
    source_url: sourceUrl,
    raw_text: text.substring(0, 500), // デバッグ用に最初の500文字
    container_html: $container.html()?.substring(0, 200), // HTML構造確認用

    // 品質チェック用フラグ
    needs_review: !nameFromRaw || !gender || !ageFromRaw, // raw_textベースで判定
    confidence_score: calculateConfidenceScore(
      nameFromRaw || name,
      gender,
      ageFromRaw || age,
      color,
      images.length
    ),
    extraction_method: nameFromRaw ? 'raw_text_priority' : 'selector_fallback', // どちらで抽出したか
  };
}

// ========================================
// raw_text優先パース関数（新規追加）
// ========================================

/**
 * raw_textから仮名を抽出
 * 例: "仮名紅蘭（クラン）種類..." → "紅蘭（クラン）"
 */
function extractNameFromRawText(text) {
  const patterns = [
    /仮名\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
    /名前\s*[:：]?\s*([^\s種類性別毛色推定年齢体重更新日]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * raw_textから犬種/猫種を抽出
 * 例: "種類トイプードル推定年齢..." → "トイプードル"
 */
function extractBreedFromRawText(text) {
  const patterns = [
    /種類\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
    /品種\s*[:：]?\s*([^\s推定年齢性別毛色体重更新日]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * raw_textから年齢を抽出
 * 例: "推定年齢２歳性別..." → "２歳"
 */
function extractAgeFromRawText(text) {
  const patterns = [
    /推定年齢\s*[:：]?\s*([^\s性別毛色体重更新日]+)/,
    /年齢\s*[:：]?\s*([^\s性別毛色体重更新日]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * raw_textから毛色を抽出
 * 例: "毛色茶トラ推定年齢..." → "茶トラ"
 */
function extractColorFromRawText(text) {
  const patterns = [
    /毛色\s*[:：]?\s*([^\s推定年齢性別種類体重更新日]+)/,
    /色\s*[:：]?\s*([^\s推定年齢性別種類体重更新日]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// ========================================
// データ抽出ヘルパー関数
// ========================================

/**
 * フォールバック: テキストベース抽出
 */
function extractAnimalsFromText($, sourceUrl) {
  const animals = [];
  const pageText = $('body').text();

  // 動物関連キーワードでセクションを分割
  const animalSections = pageText
    .split(/(?=猫|ネコ|ねこ|犬|イヌ|いぬ)/)
    .filter(
      (section) =>
        (section.includes('猫') ||
          section.includes('ネコ') ||
          section.includes('ねこ') ||
          section.includes('犬') ||
          section.includes('イヌ') ||
          section.includes('いぬ')) &&
        section.length > 20 &&
        section.length < 2000
    );

  animalSections.forEach((section, index) => {
    const animal = {
      external_id: `text_fallback_${Date.now()}_${index}`,
      animal_type: determineAnimalType(section),
      name: `保護動物${index + 1}号`,
      breed: 'ミックス',
      age_estimate: extractAge(section),
      gender: normalizeGender(extractGender(section)),
      color: extractColor(section),
      size: 'medium',
      health_status: extractHealthInfo(section),
      status: getAdoptionStatus(section),
      source_url: sourceUrl,
      extraction_method: 'text_fallback',
      raw_text: section.substring(0, 300),
      needs_review: true, // フォールバック抽出は必ずレビューが必要
      confidence_score: 0.3, // 低い信頼度
    };

    animals.push(animal);
  });

  return animals;
}

// ========================================
// データ抽出ヘルパー関数
// ========================================

function extractName($container, $) {
  const nameSelectors = ['.name', '.pet-name', 'h3', 'h4', '.title', '.animal-name'];

  for (const selector of nameSelectors) {
    const nameEl = $container.find(selector).first();
    if (nameEl.length && nameEl.text().trim()) {
      return nameEl.text().trim();
    }
  }

  return null;
}

function extractExternalId(text) {
  const match = text.match(CONFIG.patterns.id);
  return match ? match[1] || match[2] || match[3] : null;
}

function extractGender(text) {
  const match = text.match(CONFIG.patterns.gender);
  return match ? match[0] : null;
}

function normalizeGender(genderText) {
  if (!genderText) return 'unknown';

  const text = genderText.toLowerCase();
  if (
    text.includes('オス') ||
    text.includes('雄') ||
    text.includes('♂') ||
    text.includes('male')
  ) {
    return 'male';
  } else if (
    text.includes('メス') ||
    text.includes('雌') ||
    text.includes('♀') ||
    text.includes('female')
  ) {
    return 'female';
  }
  return 'unknown';
}

function extractAge(text) {
  const match = text.match(CONFIG.patterns.age);
  if (match) {
    return match[0];
  }

  // キーワードベース判定
  if (text.includes('子猫') || text.includes('仔猫') || text.includes('子犬')) return '子供';
  if (text.includes('成猫') || text.includes('成犬')) return '成体';
  if (text.includes('シニア') || text.includes('高齢')) return 'シニア';

  return null;
}

function extractColor(text) {
  const match = text.match(CONFIG.patterns.color);
  return match ? match[0] : null;
}

function extractBreed(text) {
  // 品種キーワードの検索
  const breedKeywords = [
    '雑種',
    'ミックス',
    '日本猫',
    '洋猫',
    'アメショー',
    'ペルシャ',
    'ロシアンブルー',
  ];

  for (const breed of breedKeywords) {
    if (text.includes(breed)) {
      return breed;
    }
  }

  return null;
}

function extractSize(text) {
  if (text.includes('大型') || text.includes('大きい')) return 'large';
  if (text.includes('小型') || text.includes('小さい')) return 'small';
  return 'medium';
}

function determineAnimalType(text) {
  // Use common helper function for consistency across all scrapers
  return determineAnimalTypeHelper(text, 'unknown');
}

function extractHealthInfo(text) {
  const healthKeywords = ['健康', 'ワクチン', '去勢', '避妊', '病気', '治療', '薬', '手術'];
  const healthInfo = [];

  healthKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      // キーワード周辺のテキストを抽出
      const regex = new RegExp(`[^。]{0,20}${keyword}[^。]{0,20}`, 'i');
      const match = text.match(regex);
      if (match) {
        healthInfo.push(match[0].trim());
      }
    }
  });

  return healthInfo.length > 0 ? healthInfo.join('; ') : null;
}

function extractPersonality(text) {
  const personalityKeywords = [
    '性格',
    '人懐っこい',
    'おとなしい',
    '活発',
    '甘えん坊',
    '臆病',
    '元気',
    '大人しい',
  ];

  for (const keyword of personalityKeywords) {
    if (text.includes(keyword)) {
      const regex = new RegExp(`[^。]{0,30}${keyword}[^。]{0,30}`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0].trim();
      }
    }
  }

  return null;
}

function extractSpecialNeeds(text) {
  const specialKeywords = ['特別', '注意', '投薬', '介護', 'ケア', '障害', '病気'];

  for (const keyword of specialKeywords) {
    if (text.includes(keyword)) {
      const regex = new RegExp(`[^。]{0,50}${keyword}[^。]{0,50}`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0].trim();
      }
    }
  }

  return null;
}

function extractDate(text, type) {
  // 日付パターンの抽出
  const datePatterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
    /令和\d+年\d+月\d+日/,
    /平成\d+年\d+月\d+日/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3]) {
        // 年月日形式
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        // その他の形式
        return match[0];
      }
    }
  }

  return null;
}

function calculateConfidenceScore(name, gender, age, color, imageCount) {
  let score = 0;

  if (name && name !== '名前不明' && !name.includes('保護')) score += 0.3;
  if (gender && gender !== 'unknown') score += 0.2;
  if (age) score += 0.2;
  if (color) score += 0.2;
  if (imageCount > 0) score += 0.1;

  return Math.min(score, 1.0);
}

// ========================================
// メイン処理
// ========================================

async function processAllHTMLFiles() {
  console.log('='.repeat(60));
  console.log('🐱 いしかわ動物愛護センター - HTML → YAML 変換');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    // 出力ディレクトリ作成
    if (!fs.existsSync(CONFIG.yamlOutputDir)) {
      fs.mkdirSync(CONFIG.yamlOutputDir, { recursive: true });
    }

    // 最新のHTMLファイルを取得
    const htmlFiles = fs
      .readdirSync(CONFIG.htmlDir)
      .filter((f) => f.endsWith('.html'))
      .sort()
      .reverse();

    if (htmlFiles.length === 0) {
      throw new Error(`HTMLファイルが見つかりません: ${CONFIG.htmlDir}`);
    }

    const latestHtmlFile = htmlFiles[0];
    const htmlPath = path.join(CONFIG.htmlDir, latestHtmlFile);

    console.log(`📂 HTMLファイル読み込み: ${latestHtmlFile}\n`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const sourceUrl = 'https://aigo-ishikawa.jp/petadoption_list/';

    // HTMLからYAMLデータを抽出
    const extractionResult = extractAnimalsFromHTML(html, sourceUrl, latestHtmlFile);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(extractionResult.statistics.valid_animals);

    // YAMLファイル名を生成（タイムスタンプ付き）
    const timestamp = getJSTTimestamp();
    const yamlFilename = `${timestamp}_tail.yaml`;
    const yamlFilepath = path.join(CONFIG.yamlOutputDir, yamlFilename);

    const yamlContent = yaml.dump(extractionResult, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    fs.writeFileSync(yamlFilepath, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML変換完了');
    console.log('='.repeat(60));
    console.log(`📄 保存: ${yamlFilepath}`);
    console.log(
      `📊 抽出数: ${extractionResult.statistics.valid_animals}匹の動物, ${extractionResult.statistics.extraction_errors}個のエラー`
    );
    console.log(`🎯 信頼度: ${extractionResult.confidence_level.toUpperCase()}`);
    console.log('='.repeat(60));

    if (
      extractionResult.confidence_level === 'critical' ||
      extractionResult.confidence_level === 'low'
    ) {
      console.log('\n⚠️  警告: 手動確認を推奨します');
      process.exit(1);
    }
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // エラー時も履歴を保存
    console.error('\n❌ 変換処理エラー:', error);
    process.exit(1);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  processAllHTMLFiles();
}
