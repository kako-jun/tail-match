#!/usr/bin/env node

/**
 * 千葉市動物保護指導センター YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

const CONFIG = {
  municipality: 'chiba/chiba-city',
  municipalityId: 18, // 千葉市動物保護指導センター
  base_url: 'https://www.city.chiba.jp',
  source_url:
    'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seikatsueisei/dobutsuhogo/transfercats.html',
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

function extractCatInfo($, $h4, index) {
  const heading = $h4.text().trim();
  const match = heading.match(/(\d{8})（(.+?)）/);
  if (!match) return null;

  const external_id = `chiba-city-${match[1]}`;
  const name = match[2];

  const $img = $h4.next('p').find('img');
  const images = [];
  if ($img.length > 0) {
    const src = $img.attr('src');
    if (src) images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
  }

  const $details = $img.closest('p').next('p');
  const detailText = $details.html() || '';
  const lines = detailText.split('<br>').map((l) => l.trim());

  let gender = 'unknown';
  let color = null;
  let age_estimate = null;
  let personality = null;

  lines.forEach((line) => {
    if (line.includes('性別：')) {
      const genderText = line.replace('性別：', '').trim();
      if (genderText.includes('オス')) gender = 'male';
      else if (genderText.includes('メス')) gender = 'female';
    } else if (line.includes('毛色：')) {
      color = line.replace('毛色：', '').trim();
    } else if (line.includes('年齢：')) {
      age_estimate = line.replace('年齢：', '').trim();
    } else if (line.includes('コメント：')) {
      personality = line.replace('コメント：', '').trim();
    }
  });

  return {
    external_id,
    name,
    animal_type: 'cat',
    breed: null,
    age_estimate,
    gender,
    color,
    size: null,
    health_status: null,
    personality,
    special_needs: null,
    images,
    protection_date: null,
    deadline_date: null,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡候補猫'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 千葉市動物保護指導センター - YAML抽出');
  console.log('='.repeat(60) + '\n');

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allCats = [];
    $('h4').each((index, h4) => {
      const $h4 = $(h4);
      if ($h4.text().match(/\d{8}（.+?）/)) {
        const cat = extractCatInfo($, $h4, index);
        if (cat) {
          allCats.push(cat);
          console.log(`--- 猫 ${allCats.length} ---`);
          console.log(`   名前: ${cat.name}`);
          console.log(`   性別: ${cat.gender}`);
          console.log(`   年齢: ${cat.age_estimate || '不明'}`);
          console.log(`   毛色: ${cat.color || '不明'}`);
        }
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
          note: '譲渡候補猫情報',
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
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
