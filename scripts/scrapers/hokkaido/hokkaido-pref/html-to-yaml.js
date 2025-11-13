#!/usr/bin/env node
import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { determineAnimalType } from '../../../lib/animal-type.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'hokkaido/hokkaido-pref',
  municipalityId: 19,
  base_url: 'https://www.pref.hokkaido.lg.jp',
  source_url: 'https://www.pref.hokkaido.lg.jp/ks/awc/inuneko.html',
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

function extractCatInfo($, $heading, index) {
  const headingText = $heading.text().trim();
  const match = headingText.match(/（仮名）(.+?)（雑種(.+?)\s+(オス|メス)\s+(.+?)）/);
  if (!match) return null;

  const name = match[1];
  const color = match[2];
  const genderText = match[3];
  const ageText = match[4];

  const gender = genderText === 'オス' ? 'male' : 'female';

  const images = [];
  const textParts = [headingText];
  let $next = $heading.next();
  while ($next.length && !$next.is('h3') && !$next.is('h4')) {
    $next.find('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('icon')) {
        images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
      }
    });
    const text = $next.text().trim();
    if (text) textParts.push(text);
    $next = $next.next();
  }

  // 譲渡済み判定（この動物のテキスト範囲のみで判定）
  const fullText = textParts.join(' ');
  const status = getAdoptionStatus(fullText);

  // 動物種判定（この動物のテキスト範囲で判定、デフォルトは猫）
  const animalType = determineAnimalType(fullText, 'cat');

  return {
    external_id: `hokkaido-pref-${index}`,
    name,
    animal_type: animalType,
    breed: null,
    age_estimate: ageText,
    gender,
    color,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images,
    protection_date: null,
    deadline_date: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['飼い主募集中'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 北海道立動物愛護センター - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // 前ステップのカウントを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allCats = [];
    $('h3, h4').each((index, heading) => {
      const $heading = $(heading);
      if ($heading.text().includes('（仮名）')) {
        const cat = extractCatInfo($, $heading, index);
        if (cat) {
          allCats.push(cat);
          console.log(`--- 猫 ${allCats.length} ---`);
          console.log(`   名前: ${cat.name}`);
          console.log(`   性別: ${cat.gender}`);
          console.log(`   年齢: ${cat.age_estimate}`);
          console.log(`   毛色: ${cat.color}`);
        }
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allCats.length);

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
          note: '新しい飼い主募集中の猫',
        },
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);
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
