#!/usr/bin/env node

/**
 * 宮城県動物愛護センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'miyagi/miyagi-pref-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.pref.miyagi.jp',
  source_url: 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/jyoto-inu-syokai.html',
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

function extractDogInfo($, $h3, index) {
  const heading = $h3.text().trim();
  // 例: ID:12654　キキ（全角スペース区切り）
  const match = heading.match(/ID:(\d+)[　\s](.+?)$/);
  if (!match) return null;

  const external_id = `miyagi-pref-${match[1]}`;
  const name = match[2];

  // h5タグから性別と年齢を取得（例: メス(不妊手術済み)／推定7歳）
  const $h5 = $h3.next('h5');
  const h5Text = $h5.text().trim();

  let gender = 'unknown';
  let age_estimate = null;

  if (h5Text.includes('オス') || h5Text.includes('去勢')) {
    gender = 'male';
  } else if (h5Text.includes('メス') || h5Text.includes('不妊')) {
    gender = 'female';
  }

  // 年齢抽出（例: 推定7歳）
  const ageMatch = h5Text.match(/推定(\d+)歳/);
  if (ageMatch) {
    age_estimate = `推定${ageMatch[1]}歳`;
  }

  // 画像取得（h5の次のp > img）
  const $p = $h5.next('p');
  const images = [];
  $p.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
    }
  });

  // 特徴リスト取得（ul > li）
  const $ul = $p.next('ul');
  const features = [];
  $ul.find('li').each((i, li) => {
    features.push($(li).text().trim());
  });

  const fullText = h5Text + ' ' + features.join(' ') + ' ' + heading;

  // 健康状態と特別ニーズ
  let health_status = null;
  let special_needs = null;

  features.forEach((feature) => {
    if (feature.includes('FeLV') || feature.includes('FIV')) {
      health_status = feature;
    }
    if (feature.includes('FIV陽性')) {
      special_needs = '先住犬のいないご家庭を募集';
    }
  });

  // 性格
  const personality = features
    .filter((f) => !f.includes('FeLV') && !f.includes('FIV') && !f.includes('同居犬'))
    .join('。');

  // 譲渡済み判定
  const status = getAdoptionStatus(fullText);

  return {
    external_id,
    name,
    animal_type: 'dog',
    breed: null,
    age_estimate,
    gender,
    color: null,
    size: null,
    health_status,
    personality: personality || null,
    special_needs,
    images,
    protection_date: null,
    deadline_date: null,
    status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡候補犬'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 宮城県動物愛護センター（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];
    $('h3').each((index, h3) => {
      const $h3 = $(h3);
      // 宮城県犬のパターン: ID:12654　キキ
      if ($h3.text().match(/ID:\d+[　\s].+/)) {
        const dog = extractDogInfo($, $h3, index);
        if (dog) {
          allDogs.push(dog);
          console.log(`--- 犬 ${allDogs.length} ---`);
          console.log(`   名前: ${dog.name}`);
          console.log(`   性別: ${dog.gender}`);
          console.log(`   年齢: ${dog.age_estimate || '不明'}`);
          console.log(`   画像: ${dog.images.length}枚`);
        }
      }
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

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
          total_count: allDogs.length,
          note: '譲渡候補犬情報',
        },
        animals: allDogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    logger.finalize(); // 履歴を保存

    console.log('='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // エラー時も履歴を保存
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
