#!/usr/bin/env node

/**
 * 金沢市動物愛護管理センター HTML → YAML パーサー
 *
 * HTML構造の特徴:
 * - figure.img-item に画像
 * - 直後に div.wysiwyg > table がある
 * - table caption に動物番号（例：C070327）
 * - thead tr:nth-child(2) に特徴（種類、毛色、性別、推定年齢、体格）
 * - tbody tr td に「その他」詳細情報
 * - 名前は『』で囲まれている
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
  municipality: 'ishikawa/kanazawa-city',
  municipalityId: 2, // DBに登録する際に設定
  htmlDir: 'data/html/ishikawa/kanazawa-city',
  yamlOutputDir: 'data/yaml/ishikawa/kanazawa-city',
  sourceUrl:
    'https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/7301.html',
};

// ========================================
// HTML解析関数
// ========================================

/**
 * HTMLファイルから猫データを抽出してYAML形式で出力
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

  // 金沢市の特殊構造: figure.img-item の直後に div.wysiwyg table (table-wrapperが間に入る)
  const tables = $('div.wysiwyg table');
  console.log(`   テーブル発見: ${tables.length}個`);

  tables.each((index, table) => {
    const $table = $(table);

    try {
      // 直前の画像を取得（wysiwygの前のfigure）
      const $wysiwyg = $table.closest('div.wysiwyg');
      const $figure = $wysiwyg.prev('figure.img-item');
      const imageUrl = $figure.find('img').attr('src');
      const imageAlt = $figure.find('img').attr('alt');

      // captionから動物番号を抽出
      const caption = $table.find('caption p').text().trim();
      const animalIdMatch = caption.match(/動物番号[：:]\s*(\w+)/);
      const animalId = animalIdMatch ? animalIdMatch[1] : `kanazawa_${index + 1}`;

      // thead tr:nth-child(2) から特徴を抽出
      const featureRow = $table.find('thead tr:nth-child(2)');
      const cells = featureRow.find('td');

      const breed = cells.eq(0).text().trim() || '雑種';
      const color = cells.eq(1).text().trim() || null;
      const genderText = cells.eq(2).text().trim();
      const ageText = cells.eq(3).text().trim();
      const sizeText = cells.eq(4).text().trim();

      // 性別の正規化
      let gender = 'unknown';
      if (genderText.includes('オス') || genderText.includes('雄') || genderText.includes('♂')) {
        gender = 'male';
      } else if (
        genderText.includes('メス') ||
        genderText.includes('雌') ||
        genderText.includes('♀')
      ) {
        gender = 'female';
      }

      // サイズの正規化
      let size = 'medium';
      if (sizeText.includes('大')) {
        size = 'large';
      } else if (sizeText.includes('小')) {
        size = 'small';
      }

      // tbody から詳細情報を抽出
      const detailsCell = $table.find('tbody tr td');
      const details = detailsCell.text().trim();

      // 名前を『』から抽出
      const nameMatch = details.match(/[『「]([^』」]+)[』」]/);
      const name = nameMatch ? nameMatch[1] : null;

      // 画像URLの正規化（//で始まる相対パスにhttps:を追加）
      let normalizedImageUrl = imageUrl;
      if (imageUrl && imageUrl.startsWith('//')) {
        normalizedImageUrl = 'https:' + imageUrl;
      }

      const animal = {
        external_id: animalId,
        animal_type: 'cat',
        name: name,
        breed: breed,
        age_estimate: ageText || null,
        gender: gender,
        color: color,
        size: size,
        health_status: null, // 詳細から抽出可能だが今回はシンプルに
        personality: null,
        special_needs: details, // 詳細情報全体を格納
        images: normalizedImageUrl ? [normalizedImageUrl] : [],
        protection_date: null,
        deadline_date: null,
        status:
          details.includes('譲渡済み') ||
          details.includes('譲渡しました') ||
          details.includes('譲渡決定')
            ? 'adopted'
            : 'available',
        transfer_decided: false,
        source_url: sourceUrl,
        confidence_score: name ? 0.9 : 0.6, // 名前が抽出できたら高スコア
        extraction_method: 'table_based',
      };

      animals.push(animal);
      console.log(
        `   猫 ${index + 1}: ${animal.name || '名前不明'} (${animal.external_id}, ${animal.gender})`
      );
    } catch (error) {
      console.warn(`   テーブル ${index + 1} の解析エラー:`, error.message);

      animals.push({
        extraction_error: true,
        error_message: error.message,
        table_index: index + 1,
      });
    }
  });

  console.log(`✅ 抽出完了: ${animals.length}匹`);

  // クロスチェック用の統計情報を収集
  const bodyText = $('body').text();
  const crossCheck = {
    gender_mentions: (bodyText.match(/オス|メス|♂|♀/g) || []).length,
    age_mentions: (bodyText.match(/推定年齢|歳|ヶ月|か月/g) || []).length,
    breed_mentions: (bodyText.match(/雑種|ミックス|種類/g) || []).length,
    image_tags: $('img').length,
    table_count: tables.length,
  };

  // 整合性チェック
  const validAnimalCount = animals.filter((a) => !a.extraction_error).length;
  const consistencyWarnings = [];

  if (Math.abs(validAnimalCount - crossCheck.gender_mentions) > 1) {
    consistencyWarnings.push(
      `性別表記(${crossCheck.gender_mentions})と抽出数(${validAnimalCount})に差異`
    );
  }

  if (validAnimalCount !== crossCheck.table_count) {
    consistencyWarnings.push(
      `テーブル数(${crossCheck.table_count})と抽出数(${validAnimalCount})に差異`
    );
  }

  // 信頼度レベルの判定
  let confidenceLevel = 'high';
  if (consistencyWarnings.length > 0) {
    confidenceLevel = 'medium';
  }
  if (animals.some((a) => a.extraction_error)) {
    confidenceLevel = 'low';
  }

  console.log('\n📊 クロスチェック結果:');
  console.log(`   性別表記: ${crossCheck.gender_mentions}個`);
  console.log(`   年齢表記: ${crossCheck.age_mentions}個`);
  console.log(`   テーブル数: ${crossCheck.table_count}個`);
  console.log(`   画像タグ: ${crossCheck.image_tags}個`);

  if (consistencyWarnings.length > 0) {
    console.log('\n⚠️  整合性の警告:');
    consistencyWarnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  console.log(`\n🎯 信頼度レベル: ${confidenceLevel.toUpperCase()}`);

  return {
    meta: extractionMeta,
    animals: animals,
    statistics: {
      total_tables: tables.length,
      valid_animals: validAnimalCount,
      extraction_errors: animals.filter((a) => a.extraction_error).length,
    },
    cross_check: crossCheck,
    consistency_warnings: consistencyWarnings,
    confidence_level: confidenceLevel,
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 金沢市動物愛護管理センター - HTML → YAML 変換');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
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

    // HTMLからYAMLデータを抽出
    const yamlData = extractAnimalsFromHTML(html, CONFIG.sourceUrl, latestHtmlFile);

    // YAML出力ディレクトリ作成
    fs.mkdirSync(CONFIG.yamlOutputDir, { recursive: true });

    // YAMLファイル名を生成（タイムスタンプ付き）
    const timestamp = getJSTTimestamp();
    const yamlFilename = `${timestamp}_tail.yaml`;
    const yamlPath = path.join(CONFIG.yamlOutputDir, yamlFilename);

    // YAML形式で保存
    const yamlContent = yaml.dump(yamlData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    fs.writeFileSync(yamlPath, yamlContent, 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML変換完了');
    console.log('='.repeat(60));
    console.log(`📄 保存: ${yamlPath}`);
    console.log(`📊 抽出数: ${yamlData.animals.length}匹`);
    console.log(`🎯 信頼度: ${yamlData.confidence_level.toUpperCase()}`);
    console.log('='.repeat(60));

    if (yamlData.confidence_level === 'critical' || yamlData.confidence_level === 'low') {
      console.log('\n⚠️  警告: 手動確認を推奨します');
      process.exit(1);
    }
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
