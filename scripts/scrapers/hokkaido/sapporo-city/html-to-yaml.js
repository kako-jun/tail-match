#!/usr/bin/env node

/**
 * 札幌市動物愛護管理センター YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

const CONFIG = {
  municipality: 'hokkaido/sapporo-city',
  municipalityId: 20,
  base_url: 'https://www.city.sapporo.jp',
  source_url: 'https://www.city.sapporo.jp/inuneko/syuuyou_doubutsu/jotoneko.html',
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

function extractCatFromRow($, $row, index) {
  const $cells = $row.find('td');

  if ($cells.length < 3) {
    return null; // ヘッダー行などをスキップ
  }

  // 収容番号
  const external_id = $cells.eq(0).text().trim();
  if (!external_id || external_id.includes('【') || external_id === '') {
    return null;
  }

  // 性別
  const genderText = $cells.eq(1).text().trim();
  let gender = 'unknown';
  if (genderText.includes('オス')) {
    gender = 'male';
  } else if (genderText.includes('メス')) {
    gender = 'female';
  }

  // 毛色
  const color = $cells.eq(2).text().trim();

  // 推定年齢 or 推定月齢
  const ageText = $cells.eq(3).text().trim();

  return {
    external_id: external_id,
    name: external_id, // 札幌市は収容番号のみ
    animal_type: 'cat',
    breed: null,
    age_estimate: ageText,
    gender: gender,
    color: color,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: [],
    protection_date: null,
    deadline_date: null,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡可能猫情報'],
    listing_type: 'adoption',
  };
}

function extractCatFromH3($, $h3, index) {
  const headingText = $h3.text().trim();
  const match = headingText.match(/(.+?)（(.+?)）\s+(.+?)\s+(オス|メス|去勢オス|避妊メス)/);
  if (!match) return null;

  const name = match[1];
  const external_id = match[2];
  const ageText = match[3];
  const genderText = match[4];

  let gender = 'unknown';
  if (genderText.includes('オス')) {
    gender = 'male';
  } else if (genderText.includes('メス')) {
    gender = 'female';
  }

  // 画像を探す
  const images = [];
  let $next = $h3.next();
  while ($next.length && !$next.is('h2') && !$next.is('h3')) {
    $next.find('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('icon')) {
        images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
      }
    });
    $next = $next.next();
  }

  return {
    external_id: external_id,
    name: name,
    animal_type: 'cat',
    breed: null,
    age_estimate: ageText,
    gender: gender,
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: images,
    protection_date: null,
    deadline_date: null,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡可能成猫情報'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 札幌市動物愛護管理センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allCats = [];

    // 子猫：テーブルから抽出
    console.log('子猫を抽出中...');
    $('table tr').each((index, row) => {
      const $row = $(row);
      const cat = extractCatFromRow($, $row, index);

      if (cat) {
        allCats.push(cat);
        console.log(`--- 猫 ${allCats.length} ---`);
        console.log(`   収容番号: ${cat.external_id}`);
        console.log(`   性別: ${cat.gender}`);
        console.log(`   年齢: ${cat.age_estimate}`);
        console.log(`   毛色: ${cat.color}`);
      }
    });

    // 成猫：h3タグから抽出
    console.log('\n成猫を抽出中...');
    $('h3').each((index, h3) => {
      const $h3 = $(h3);
      const cat = extractCatFromH3($, $h3, index);

      if (cat) {
        allCats.push(cat);
        console.log(`--- 猫 ${allCats.length} ---`);
        console.log(`   名前: ${cat.name}`);
        console.log(`   収容番号: ${cat.external_id}`);
        console.log(`   性別: ${cat.gender}`);
        console.log(`   年齢: ${cat.age_estimate}`);
        console.log(`   画像数: ${cat.images.length}`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

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
          note: '譲渡可能猫情報',
        },
        animals: allCats,
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
