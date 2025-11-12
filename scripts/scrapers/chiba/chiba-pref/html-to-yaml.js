#!/usr/bin/env node

/**
 * 千葉県動物愛護センター YAML抽出スクリプト
 *
 * 特徴:
 * - 収容猫情報ページから猫情報を抽出
 * - YAML形式で出力
 * - 空状態（0匹）対応
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'chiba/chiba-pref',
  municipalityId: 17, // 千葉県動物愛護センター
  base_url: 'https://www.pref.chiba.lg.jp',
  source_url: 'https://www.pref.chiba.lg.jp/aigo/pet/inu-neko/shuuyou/shuu-neko-tou.html',
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
 * 猫情報ブロックから情報を抽出
 */
function extractCatFromBlock($, $block, index) {
  const $col2L = $block.find('.col2L');

  if ($col2L.length === 0) {
    return null;
  }

  // 全てのpタグからテキストを取得
  const textLines = [];
  $col2L.find('p').each((i, p) => {
    const text = $(p).text().trim();
    if (text && text !== '&nbsp;') {
      textLines.push(text);
    }
  });

  // 管理番号の取得
  const managementNumber = textLines.find((line) => line.includes('【管理番号】'));
  if (!managementNumber) {
    return null; // テンプレートの可能性
  }

  // 収容場所
  const location = textLines.find((line) => line.includes('【収容場所】')) || '';

  // 種類・毛色・性別
  const typeInfo = textLines.find(
    (line) => !line.includes('【') && (line.includes('オス') || line.includes('メス'))
  );

  // 画像URL
  const $img = $col2L.find('img');
  const images = [];
  if ($img.length > 0) {
    const src = $img.attr('src');
    if (src && !src.includes('no_gazou')) {
      const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
      images.push(fullUrl);
    }
  }

  // 掲載期限
  const deadlineLine = textLines.find((line) => line.includes('【掲載期限】'));
  let deadline_date = null;
  if (deadlineLine) {
    const match = deadlineLine.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      deadline_date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }

  // 性別の判定
  let gender = 'unknown';
  if (typeInfo) {
    if (typeInfo.includes('オス')) {
      gender = 'male';
    } else if (typeInfo.includes('メス')) {
      gender = 'female';
    }
  }

  return {
    external_id: `chiba-pref-${index}`,
    name: managementNumber.replace('【管理番号】', '').trim(),
    animal_type: 'cat',
    breed: null,
    age_estimate: null,
    gender: gender,
    color: typeInfo,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: images,
    protection_date: null,
    deadline_date: deadline_date,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['収容猫情報（東葛飾支所）', location],
    listing_type: 'lost_pet',
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 千葉県動物愛護センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 収容猫ブロックを探す
    const allCats = [];
    const $content = $('#tmp_contents');

    // テンプレートではなく実際の収容データを探す
    const $headings = $content.find('h2');

    if ($headings.length === 0 || $headings.first().text().includes('テンプレート')) {
      // 収容猫なし
      console.log('⚠️ 現在収容されている猫はいません');

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
            source_file: path.basename(htmlFile),
            source_url: CONFIG.source_url,
            extracted_at: getJSTISOString(),
            municipality: CONFIG.municipality,
            municipality_id: CONFIG.municipalityId,
            total_count: 0,
            note: '収容猫なし（東葛飾支所）',
          },
          animals: [],
        },
        { indent: 2, lineWidth: -1 }
      );

      fs.writeFileSync(outputFile, yamlContent, 'utf-8');

      console.log(`\n✅ YAML出力完了: ${outputFile}`);
      console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

      console.log('\n' + '='.repeat(60));
      console.log('✅ YAML抽出完了（0匹）');
      console.log('='.repeat(60));
      return;
    }

    // 実際の猫情報がある場合の処理
    $headings.each((index, heading) => {
      const $heading = $(heading);
      if (!$heading.text().includes('テンプレート')) {
        const $nextCol2 = $heading.next('.col2');
        if ($nextCol2.length > 0) {
          const cat = extractCatFromBlock($, $nextCol2, index + 1);
          if (cat) {
            allCats.push(cat);
            console.log(`\n--- 猫 ${allCats.length} ---`);
            console.log(`   名前: ${cat.name}`);
            console.log(`   性別: ${cat.gender}`);
            console.log(`   掲載期限: ${cat.deadline_date || '不明'}`);
          }
        }
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // Step 3: YAML出力
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
          source_file: path.basename(htmlFile),
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: CONFIG.municipalityId,
          total_count: allCats.length,
          note: '収容猫情報（東葛飾支所）',
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
