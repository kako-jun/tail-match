#!/usr/bin/env node

/**
 * 広島市動物愛護センター（猫・犬混在） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { determineAnimalType } from '../../../lib/animal-type.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'hiroshima/hiroshima-city',
  municipalityId: null,
  base_url: 'https://www.city.hiroshima.lg.jp',
  source_url: 'https://www.city.hiroshima.lg.jp/living/pet-doubutsu/1021301/1026246/1023100.html',
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

function extractAnimalInfo($, $h4, animalType) {
  const heading = $h4.text().trim();
  // 例: No.7-9-5（はちのすけ）譲渡が決まりました！ or 7-10-3（らーめん）申請中
  const match = heading.match(/(?:No\.)?([67]-\d+-\d+)[（(](.+?)[)）](.*)$/);
  if (!match) return null;

  const id = match[1]; // 7-9-5
  const name = match[2]; // はちのすけ
  const statusText = match[3].trim(); // 譲渡が決まりました！ or 申請中

  const external_id = `hiroshima-city-${id}`;

  // ステータス判定
  const status = getAdoptionStatus(statusText);

  // 画像取得（次のdiv.imagewrap内のimg）
  const images = [];
  const $imageDiv = $h4.next('div.imagewrap');
  if ($imageDiv.length) {
    $imageDiv.find('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        // 相対パスを絶対パスに変換
        const fullUrl = src.startsWith('http')
          ? src
          : CONFIG.base_url + src.replace(/^\.\.\/\.\.\/\.\.\/\.\./, '');
        images.push(fullUrl);
      }
    });
  }

  // 詳細情報取得（次のdl）
  const $dl = $imageDiv.next('dl');
  const detailsHtml = $dl.html() || '';

  // ddタグの内容を取得
  const $details = load(detailsHtml);
  const detailsText = $details('dd').text().trim();

  let gender = 'unknown';
  let age_estimate = null;
  let breed = null;
  let size = null;
  let personality = null;

  // 性別判定
  if (detailsText.includes('雌') || detailsText.includes('メス')) {
    gender = 'female';
  } else if (detailsText.includes('雄') || detailsText.includes('オス')) {
    gender = 'male';
  }

  // 年齢抽出
  const ageMatch = detailsText.match(/([0-9０-９]+)歳/);
  const monthMatch = detailsText.match(/([0-9０-９.]+)[かヶケ]月/);
  if (ageMatch) {
    const age = ageMatch[1].replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    age_estimate = `${age}歳`;
  } else if (monthMatch) {
    const months = monthMatch[1].replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    age_estimate = `${months}ヶ月`;
  }

  // 犬の場合は体重を抽出
  if (animalType === 'dog') {
    const weightMatch = detailsText.match(/([0-9０-９.]+)\s?kg/i);
    if (weightMatch) {
      const weight = weightMatch[1].replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      );
      size = `${weight}kg`;
    }
  }

  // 性格・特徴を抽出（改行区切りで取得）
  const personalityLines = [];
  $details('dd p').each((i, p) => {
    const text = $(p).text().trim();
    if (text && !text.includes('譲渡') && !text.includes('申請')) {
      personalityLines.push(text);
    }
  });
  personality = personalityLines.join('。');

  return {
    external_id,
    name,
    animal_type: animalType,
    breed,
    age_estimate,
    gender,
    color: null,
    size,
    health_status: null,
    personality: personality || null,
    special_needs: null,
    images,
    protection_date: null,
    deadline_date: null,
    status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [statusText || '譲渡対象'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱🐕 広島市動物愛護センター（猫・犬混在） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allAnimals = [];
    let currentAnimalType = null;

    // h3とh4を順番に処理
    $('h3, h4').each((index, elem) => {
      const $elem = $(elem);

      if (elem.name === 'h3') {
        // 動物種の切り替え
        const h3Text = $elem.text().trim();
        currentAnimalType = determineAnimalType(h3Text);
        console.log(`\n--- ${h3Text}セクション ---`);
      } else if (elem.name === 'h4' && currentAnimalType) {
        // h4の場合、IDパターンをチェック
        const h4Text = $elem.text();
        if (h4Text.match(/(?:No\.)?[67]-\d+-\d+[（(].+?[)）]/)) {
          const animal = extractAnimalInfo($, $elem, currentAnimalType);
          if (animal) {
            allAnimals.push(animal);
            const icon = animal.animal_type === 'cat' ? '🐱' : '🐕';
            console.log(
              `${icon} ${allAnimals.length}. ${animal.name} (${animal.external_id}) - ${animal.status}`
            );
          }
        }
      }
    });

    console.log(`\n📊 合計抽出数: ${allAnimals.length}匹`);
    console.log(`   🐱 猫: ${allAnimals.filter((a) => a.animal_type === 'cat').length}匹`);
    console.log(`   🐕 犬: ${allAnimals.filter((a) => a.animal_type === 'dog').length}匹`);

    logger.logYAMLCount(allAnimals.length);

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
          total_count: allAnimals.length,
          note: '譲渡対象動物情報（猫・犬混在）',
        },
        animals: allAnimals,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    logger.finalize();

    console.log('='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize();
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
