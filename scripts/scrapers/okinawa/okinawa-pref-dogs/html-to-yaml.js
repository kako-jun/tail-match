#!/usr/bin/env node

/**
 * 沖縄県動物愛護管理センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'okinawa/okinawa-pref-dogs',
  municipalityId: 21,
  base_url: 'https://www.aniwel-pref.okinawa',
  source_url: 'https://www.aniwel-pref.okinawa/animals/transfer/dogs',
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

function extractDogFromLink($, $link) {
  const href = $link.attr('href');
  if (!href) return null;

  const match = href.match(/\/animals\/transfer_view\/(\d+)/);
  if (!match) return null;

  const external_id = match[1];

  const $title = $link.find('.title p');
  const fullName = $title.text().trim();

  const isAdopted = fullName.includes('※譲渡しました');

  let name = fullName
    .replace(/^推進棟\s*/, '')
    .replace(/\s*※.*$/, '')
    .trim();

  const $date = $link.find('.title .date');
  const dateText = $date.text().trim();

  const $img = $link.find('.pic img');
  const imgSrc = $img.attr('src');
  const images = [];
  if (imgSrc) {
    images.push(imgSrc.startsWith('http') ? imgSrc : CONFIG.base_url + imgSrc);
  }

  let specialNeeds = null;
  if (fullName.includes('※') && !isAdopted) {
    specialNeeds = fullName.match(/※(.+)$/)?.[1] || null;
  }

  return {
    external_id: external_id,
    name: name || external_id,
    animal_type: 'dog',
    breed: null,
    age_estimate: null,
    gender: 'unknown',
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: specialNeeds,
    images: images,
    protection_date: dateText || null,
    deadline_date: null,
    status: isAdopted ? 'adopted' : 'available',
    source_url: CONFIG.source_url,
    confidence_level: 'medium',
    extraction_notes: isAdopted ? ['譲渡済み犬情報'] : ['譲渡希望犬情報'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 沖縄県動物愛護管理センター（犬） - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];
    $('a[href*="/animals/transfer_view/"]').each((index, link) => {
      const dog = extractDogFromLink($, $(link));
      if (dog) {
        allDogs.push(dog);
        console.log(`   犬 ${index + 1}: ${dog.name} (${dog.status})`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

    if (allDogs.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

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
          municipality_id: CONFIG.municipalityId,
          total_count: allDogs.length,
        },
        animals: allDogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // エラー時も履歴を保存
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
