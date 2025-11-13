#!/usr/bin/env node

/**
 * 大阪市動物管理センター YAML抽出スクリプト
 *
 * 特徴:
 * - h3要素から識別番号と仮名を抽出
 * - 詳細情報はp要素の<br>区切りテキストから抽出
 * - YAML形式で出力
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'osaka/osaka-city-cats',
  base_url: 'https://www.city.osaka.lg.jp/kenko',
  source_url: 'https://www.city.osaka.lg.jp/kenko/page/0000206027.html',
};

// ========================================
// ユーティリティ
// ========================================

/**
 * 最新のHTMLファイルを取得
 */
function getLatestHtmlFile() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(htmlDir)) {
    throw new Error(`HTMLディレクトリが見つかりません: ${htmlDir}`);
  }

  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('_tail.html'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('HTMLファイルが見つかりません');
  }

  return path.join(htmlDir, files[0]);
}

/**
 * 性別文字列を解析
 */
function parseGender(genderStr) {
  if (!genderStr) return 'unknown';

  genderStr = genderStr.trim();

  if (genderStr.includes('オス')) {
    return 'male';
  } else if (genderStr.includes('メス')) {
    return 'female';
  } else {
    return 'unknown';
  }
}

/**
 * h3から識別番号と仮名を抽出
 * 例: "識別番号 / 7-4-15（仮名：メメちゃん）"
 */
function parseH3Title(h3Text) {
  const result = {
    id: null,
    name: null,
  };

  // "識別番号 / ID" を抽出
  const idMatch = h3Text.match(/識別番号\s*[/／]\s*([^\s（]+)/);
  if (idMatch) {
    result.id = idMatch[1].trim();
  }

  // "（仮名：名前）" を抽出
  const nameMatch = h3Text.match(/[（(]仮名[：:]\s*([^）)]+)[）)]/);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  return result;
}

/**
 * 詳細情報テキストを解析
 * 例: "・種類／雑種<br>・毛色／キジ白<br>・性別／メス（避妊済）<br>..."
 */
function parseDetails(detailsHtml, $) {
  const details = {
    breed: null,
    color: null,
    gender: null,
    age: null,
    size: null,
    personality: null,
    health: null,
  };

  // HTML内の<br>をテキスト改行に変換
  const text = $.html(detailsHtml)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ''); // HTMLタグを除去

  const lines = text.split('\n');

  lines.forEach((line) => {
    line = line.trim();

    if (line.includes('種類／') || line.includes('種類/')) {
      details.breed = line.split(/[／/]/)[1]?.trim();
    } else if (line.includes('毛色／') || line.includes('毛色/')) {
      details.color = line.split(/[／/]/)[1]?.trim();
    } else if (line.includes('性別／') || line.includes('性別/')) {
      const genderText = line.split(/[／/]/)[1]?.trim();
      details.gender = parseGender(genderText);
    } else if (line.includes('年齢／') || line.includes('年齢/')) {
      details.age = line.split(/[／/]/)[1]?.trim();
    } else if (line.includes('体格／') || line.includes('体格/')) {
      details.size = line.split(/[／/]/)[1]?.trim();
    } else if (line.includes('性格／') || line.includes('性格/')) {
      details.personality = line.split(/[／/]/)[1]?.trim();
    } else if (line.includes('その他／') || line.includes('その他/')) {
      details.health = line.split(/[／/]/)[1]?.trim();
    }
  });

  return details;
}

/**
 * 画像URLを抽出
 */
function extractImages($, $section) {
  const images = [];

  $section.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src && !src.includes('clearspacer.gif') && !src.includes('new_window')) {
      // 相対URLを絶対URLに変換
      let fullUrl = src;
      if (src.startsWith('./')) {
        fullUrl = CONFIG.base_url + '/' + src.substring(2);
      } else if (src.startsWith('/')) {
        fullUrl = 'https://www.city.osaka.lg.jp' + src;
      }
      images.push(fullUrl);
    }
  });

  return images;
}

/**
 * セクションから猫情報を抽出
 */
function extractCatFromSection($, $h3, index) {
  // h3から識別番号と名前を取得
  const h3Text = $h3.text().trim();
  const { id, name } = parseH3Title(h3Text);

  if (!id) {
    console.warn(`⚠️ 識別番号が見つかりません: ${h3Text}`);
    return null;
  }

  // h3は<div class="sub_h3_box">の中にあるので、親要素の次の要素から探す
  const $h3Container = $h3.closest('div.sub_h3_box');
  const $imageBlocks = $h3Container.nextUntil('div.sub_h3_box', 'div.mol_imageblock');
  const images = [];
  let details = null;

  $imageBlocks.each((i, block) => {
    const $block = $(block);

    // 画像を取得
    const blockImages = extractImages($, $block);
    images.push(...blockImages);

    // pタグから詳細情報を取得
    const $p = $block.find('p');
    if ($p.length > 0 && $p.html()) {
      // 最後のpタグ（詳細情報を含む可能性が高い）
      const lastP = $p.last();
      if (lastP.html() && lastP.html().includes('種類')) {
        details = parseDetails(lastP, $);
      }
    }
  });

  // 譲渡済み判定（h3とブロック全体のテキストで判定）
  const textParts = [h3Text];
  $imageBlocks.each((i, block) => {
    textParts.push($(block).text());
  });
  const fullText = textParts.join(' ');
  const status = getAdoptionStatus(fullText);

  // 動物種判定（デフォルトは猫）
  const animalType = /犬|イヌ|dog/i.test(fullText) ? 'dog' : 'cat';

  const cat = {
    external_id: id,
    name: name,
    animal_type: animalType,
    breed: details?.breed,
    age_estimate: details?.age,
    gender: details?.gender || 'unknown',
    color: details?.color,
    size: details?.size,
    health_status: details?.health,
    personality: details?.personality,
    special_needs: null,
    images: images.length > 0 ? images : [],
    protection_location: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [],
  };

  // 画像がない場合は警告
  if (images.length === 0) {
    cat.extraction_notes.push('画像が見つかりませんでした');
    cat.confidence_level = 'medium';
  }

  // 詳細情報がない場合は警告
  if (!details) {
    cat.extraction_notes.push('詳細情報が取得できませんでした');
    cat.confidence_level = 'medium';
  }

  if (!cat.gender || cat.gender === 'unknown') {
    cat.extraction_notes.push('性別情報が不明確です');
    cat.confidence_level = 'medium';
  }

  return cat;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 大阪市動物管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: h3要素を取得（識別番号を含むもの）
    const h3Elements = $('h3')
      .filter((i, elem) => {
        const text = $(elem).text();
        return text.includes('識別番号');
      })
      .toArray();

    console.log(`📊 検出した猫数: ${h3Elements.length}`);

    if (h3Elements.length === 0) {
      console.warn('⚠️ 猫情報が見つかりませんでした');
      return;
    }

    // Step 3: 各h3から猫情報を抽出
    const allCats = [];
    h3Elements.forEach((h3, index) => {
      console.log(`\n--- 猫 ${index + 1}/${h3Elements.length} ---`);
      const cat = extractCatFromSection($, $(h3), index);

      if (cat) {
        console.log(`   ID: ${cat.external_id}, 名前: ${cat.name}, 性別: ${cat.gender}`);
        allCats.push(cat);
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // Step 4: YAML出力
    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();

    const outputFile = path.join(outputDir, `${timestamp}_tail.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          total_count: allCats.length,
        },
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
