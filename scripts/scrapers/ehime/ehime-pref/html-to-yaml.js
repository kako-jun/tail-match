#!/usr/bin/env node

/**
 * 愛媛県動物愛護センター YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'ehime/ehime-pref',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.pref.ehime.jp',
  source_url: 'https://www.pref.ehime.jp/page/17125.html',
};

function getLatestHtmlFile() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );
  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('_tail.html'))
    .sort()
    .reverse();
  return path.join(htmlDir, files[0]);
}

/**
 * テーブルから動物情報を抽出
 * 各テーブルは横方向に複数の動物を含む
 */
function extractAnimalsFromTable($, table, animalType) {
  const animals = [];
  const $table = $(table);

  // 各行を取得
  const rows = $table.find('tr').toArray();
  if (rows.length < 4) return animals; // 写真・年齢・毛色・性別の4行が必要

  const photoRow = $(rows[0]);
  const ageRow = $(rows[1]);
  const colorRow = $(rows[2]);
  const genderRow = $(rows[3]);

  // 各列（動物）を処理
  const photoCells = photoRow.find('td').toArray();
  for (let i = 0; i < photoCells.length; i++) {
    // 画像URL取得
    const $img = $(photoCells[i]).find('img');
    const imgSrc = $img.attr('src');
    if (!imgSrc) continue;

    const imageUrl = imgSrc.startsWith('http') ? imgSrc : CONFIG.base_url + imgSrc;

    // 年齢取得（「2024年4月生」形式）
    const birthEstimate = ageRow.find('td').eq(i).text().trim();

    // 毛色取得
    const color = colorRow.find('td').eq(i).text().trim();

    // 性別取得（「オス（去勢）」「メス」など）
    const genderText = genderRow.find('td').eq(i).text().trim();
    let gender = 'unknown';
    if (genderText.includes('オス') || genderText.includes('雄')) {
      gender = 'male';
    } else if (genderText.includes('メス') || genderText.includes('雌')) {
      gender = 'female';
    }

    // external_id生成（画像ファイル名から）
    const imageFileName = imgSrc
      .split('/')
      .pop()
      .replace(/\.(jpg|png|jpeg)$/i, '');
    const external_id = `ehime-pref-${animalType}-${imageFileName}`;

    const animalInfo = {
      external_id,
      municipality_id: CONFIG.municipalityId,
      name: '', // 愛媛県は名前なし
      gender,
      age_estimate: '', // 推定年齢ではなく推定生年月
      birth_estimate: birthEstimate,
      description: `毛色: ${color}${genderText.includes('去勢') || genderText.includes('避妊') ? '\n' + genderText : ''}`,
      status: 'available', // 全員譲渡可能
      source_url: CONFIG.source_url,
      images: [imageUrl],
      scraped_at: getJSTISOString(),
    };

    animals.push(animalInfo);
  }

  return animals;
}

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐾 愛媛県動物愛護センター - YAML抽出');
  console.log('='.repeat(60) + '\n');

  try {
    // 最新HTMLファイルを取得
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 読み込み: ${htmlPath}`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    let cats = [];
    let dogs = [];
    let currentSection = null;

    // 全テーブルを処理し、captionの内容で猫/犬を判定
    console.log('🔍 動物情報を抽出中...');
    $('table.datatable').each((i, table) => {
      const $table = $(table);
      const caption = $table.find('caption').text().trim();

      // captionに「猫」または「犬」が含まれているかチェック
      if (caption.includes('猫')) {
        currentSection = 'cat';
      } else if (caption.includes('犬')) {
        currentSection = 'dog';
      }

      // テーブルから動物情報を抽出
      if (currentSection === 'cat') {
        const extracted = extractAnimalsFromTable($, table, 'cat');
        cats = cats.concat(extracted);
      } else if (currentSection === 'dog') {
        const extracted = extractAnimalsFromTable($, table, 'dog');
        dogs = dogs.concat(extracted);
      }
    });

    console.log(`✅ 猫: ${cats.length}匹、犬: ${dogs.length}匹を抽出しました`);

    const allAnimals = [...cats, ...dogs];
    console.log(`📊 合計: ${allAnimals.length}匹（猫: ${cats.length}, 犬: ${dogs.length})`);
    logger.logYAMLCount(allAnimals.length);

    // YAML出力ディレクトリ作成
    const yamlDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(yamlDir, { recursive: true });

    // YAMLファイル名生成
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_animals.yaml`;
    const filepath = path.join(yamlDir, filename);

    // YAML保存
    const yamlContent = yaml.dump(allAnimals, { indent: 2, lineWidth: -1 });
    fs.writeFileSync(filepath, yamlContent, 'utf-8');
    console.log(`💾 YAML保存: ${filepath}\n`);

    // 詳細表示
    console.log('詳細:');
    allAnimals.forEach((animal, i) => {
      const type = animal.external_id.includes('-cat-') ? '猫' : '犬';
      console.log(`  ${i + 1}. [${type}] ${animal.birth_estimate || 'unknown'} (${animal.gender})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    logger.finalize();
  }
}

main();
