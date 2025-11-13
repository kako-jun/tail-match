#!/usr/bin/env node

/**
 * 沖縄県動物愛護管理センター YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'okinawa/okinawa-pref-cats',
  municipalityId: 21,
  base_url: 'https://www.aniwel-pref.okinawa',
  source_url: 'https://www.aniwel-pref.okinawa/animals/transfer/cats',
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

function extractCatFromLink($, $link) {
  // リンクからIDを抽出
  const href = $link.attr('href');
  if (!href) return null;

  const match = href.match(/\/animals\/transfer_view\/(\d+)/);
  if (!match) return null;

  const external_id = match[1];

  // 名前を抽出
  const $title = $link.find('.title p');
  const fullName = $title.text().trim();

  // 譲渡済みかどうかを判定（共通ヘルパー関数を使用）
  const status = getAdoptionStatus(fullName);

  // 名前から「推進棟」と「※」以降を除去
  let name = fullName
    .replace(/^推進棟\s*/, '')
    .replace(/\s*※.*$/, '')
    .trim();

  // 日付を抽出
  const $date = $link.find('.title .date');
  const dateText = $date.text().trim();

  // 画像を抽出
  const $img = $link.find('.pic img');
  const imgSrc = $img.attr('src');
  const images = [];
  if (imgSrc) {
    images.push(imgSrc.startsWith('http') ? imgSrc : CONFIG.base_url + imgSrc);
  }

  // 備考（※環境調査中など）を抽出
  let specialNeeds = null;
  if (fullName.includes('※') && status === 'available') {
    specialNeeds = fullName.match(/※(.+)$/)?.[1] || null;
  }

  return {
    external_id: external_id,
    name: name || external_id,
    animal_type: 'cat',
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
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'medium',
    extraction_notes: status === 'adopted' ? ['譲渡済み猫情報'] : ['譲渡希望猫情報'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 沖縄県動物愛護管理センター - YAML抽出');
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

    const allCats = [];

    // 各猫のリンクを抽出
    $('.animals .lists > a').each((index, link) => {
      const $link = $(link);
      const cat = extractCatFromLink($, $link);

      if (cat) {
        allCats.push(cat);
        console.log(`--- 猫 ${allCats.length} ---`);
        console.log(`   名前: ${cat.name}`);
        console.log(`   ID: ${cat.external_id}`);
        console.log(`   ステータス: ${cat.status}`);
        console.log(`   日付: ${cat.protection_date}`);
        console.log(`   画像: ${cat.images.length}枚`);
        if (cat.special_needs) {
          console.log(`   備考: ${cat.special_needs}`);
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
          note: '譲渡希望猫情報',
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
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
