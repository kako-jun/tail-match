#!/usr/bin/env node

/**
 * 那覇市環境衛生課 YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

const CONFIG = {
  municipality: 'okinawa/naha-city',
  municipalityId: 22,
  base_url: 'https://www.city.naha.okinawa.jp',
  source_url: 'https://www.city.naha.okinawa.jp/kurasitetuduki/animal/904.html',
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

function extractAnimalFromDiv($, $div, animalType) {
  // 画像を抽出
  const $img = $div.find('img');
  const imgSrc = $img.attr('src');
  const images = [];
  if (imgSrc) {
    images.push(
      imgSrc.startsWith('http') ? imgSrc : CONFIG.base_url + '/kurasitetuduki/animal/' + imgSrc
    );
  }

  // 名前を抽出（spanタグから）
  const $span = $div.find('span');
  const name = $span.text().trim();

  // 名前がない、または「譲渡できる」などのメッセージの場合はスキップ
  if (!name || name.includes('譲渡できる') || name.includes('いません')) return null;

  // 詳細情報を抽出（pタグから）
  const $details = $div.find('p').last();
  const detailText = $details.text();

  // 各フィールドを抽出
  let breed = null;
  let gender = 'unknown';
  let ageEstimate = null;
  let weight = null;
  let personality = null;
  let photoDate = null;
  let specialNeeds = null;

  // 犬種/猫種（次のフィールドまで、または改行まで）
  const breedMatch = detailText.match(/(?:犬種|猫種)：([^性推体]+)/);
  if (breedMatch) {
    breed = breedMatch[1].trim();
  }

  // 性別（次のフィールドまで、または改行まで）
  const genderMatch = detailText.match(/性別：([^推体性写]+)/);
  if (genderMatch) {
    const genderText = genderMatch[1].trim();
    if (genderText.includes('オス')) {
      gender = 'male';
    } else if (genderText.includes('メス')) {
      gender = 'female';
    }
  }

  // 推定年齢（次のフィールドまで、または改行まで）
  const ageMatch = detailText.match(/推定年齢：([^体性写]+)/);
  if (ageMatch) {
    ageEstimate = ageMatch[1].trim();
  }

  // 体重（次のフィールドまで、または改行まで）
  const weightMatch = detailText.match(/体重：?([^性写]+?)(?:kg|$)/);
  if (weightMatch) {
    weight = weightMatch[1].trim() + 'kg';
  }

  // 性格・特徴（フィラリアの前まで、または写真撮影日の前まで）
  const personalityMatch = detailText.match(/性格・特徴：([^写]+?)(?:フィラリア|写真撮影日)/);
  if (personalityMatch) {
    personality = personalityMatch[1].trim();
  }

  // 写真撮影日
  const photoDateMatch = detailText.match(/写真撮影日：(.+?)$/);
  if (photoDateMatch) {
    photoDate = photoDateMatch[1].trim();
  }

  // 特別な医療情報を抽出
  const healthNotes = [];
  if (detailText.includes('フィラリア')) {
    const filariaMatch = detailText.match(/フィラリア[^。]+/);
    if (filariaMatch) {
      healthNotes.push(filariaMatch[0]);
    }
  }
  if (detailText.includes('白内障')) {
    healthNotes.push('白内障あり');
  }
  if (detailText.includes('皮膚炎')) {
    healthNotes.push('皮膚炎あり');
  }
  if (detailText.includes('腫瘤')) {
    healthNotes.push('乳腺に腫瘤あり');
  }

  if (healthNotes.length > 0) {
    specialNeeds = healthNotes.join('、');
  }

  // external_idは名前をそのまま使用（那覇市にはIDがない）
  const external_id = name;

  return {
    external_id: external_id,
    name: name,
    animal_type: animalType,
    breed: breed,
    age_estimate: ageEstimate,
    gender: gender,
    color: null,
    size: weight ? `体重${weight}` : null,
    health_status: null,
    personality: personality,
    special_needs: specialNeeds,
    images: images,
    protection_date: photoDate,
    deadline_date: null,
    status: getAdoptionStatus(detailText),
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [`${animalType === 'dog' ? '譲渡犬' : '譲渡猫'}情報`],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕🐱 那覇市環境衛生課 - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allAnimals = [];

    // 譲渡犬紹介セクションを探す
    let inDogSection = false;
    let inCatSection = false;

    $('div').each((index, element) => {
      const $element = $(element);

      // セクションヘッダーをチェック
      const h3 = $element.find('h3').text();
      if (h3.includes('譲渡犬紹介')) {
        inDogSection = true;
        inCatSection = false;
        console.log('🐕 譲渡犬セクション開始\n');
        return;
      } else if (h3.includes('譲渡猫紹介')) {
        inDogSection = false;
        inCatSection = true;
        console.log('\n🐱 譲渡猫セクション開始\n');
        return;
      }

      // img-area-l divを処理
      if ($element.hasClass('img-area-l')) {
        let animalType = null;
        if (inDogSection) {
          animalType = 'dog';
        } else if (inCatSection) {
          animalType = 'cat';
        }

        if (animalType) {
          const animal = extractAnimalFromDiv($, $element, animalType);
          if (animal) {
            allAnimals.push(animal);
            console.log(`--- ${animalType === 'dog' ? '犬' : '猫'} ${allAnimals.length} ---`);
            console.log(`   名前: ${animal.name}`);
            console.log(`   種類: ${animal.animal_type}`);
            console.log(`   品種: ${animal.breed || '不明'}`);
            console.log(`   性別: ${animal.gender}`);
            console.log(`   年齢: ${animal.age_estimate || '不明'}`);
            console.log(`   サイズ: ${animal.size || '不明'}`);
            console.log(`   性格: ${animal.personality || '不明'}`);
            if (animal.special_needs) {
              console.log(`   医療情報: ${animal.special_needs}`);
            }
            console.log(`   画像: ${animal.images.length}枚`);
            console.log();
          }
        }
      }
    });

    console.log(`\n📊 合計抽出数: ${allAnimals.length}匹`);
    const dogCount = allAnimals.filter((a) => a.animal_type === 'dog').length;
    const catCount = allAnimals.filter((a) => a.animal_type === 'cat').length;
    console.log(`   犬: ${dogCount}匹`);
    console.log(`   猫: ${catCount}匹`);

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
          dog_count: dogCount,
          cat_count: catCount,
          note: '譲渡動物情報（犬・猫）',
        },
        animals: allAnimals,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);
    console.log('='.repeat(60));
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

main();
