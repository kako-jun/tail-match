#!/usr/bin/env node

/**
 * 新潟市動物愛護センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'niigata/niigata-city-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.ikutopia.com',
  source_url: 'https://www.ikutopia.com/facilities/doubutsu/foster/dog/',
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
 * リストから犬情報を抽出
 * HTMLパターン: <li><a href="/fosterinfo/XXXX/">
 *   <p class="register">登録番号：2025d10</p>
 *   <h2 class="title">ずんだ (推定2歳)</h2>
 * </a></li>
 */
function extractDogInfoFromList($) {
  const dogs = [];

  // カード型リストを検索
  $('div.p-foster-archive li').each((index, elem) => {
    const $li = $(elem);
    const $link = $li.find('a');
    const href = $link.attr('href');

    // 登録番号を取得（例：2025d10）
    const registerText = $li.find('p.register').text().trim();
    const registerMatch = registerText.match(/(\d{4}d\d+)/);
    if (!registerMatch) return;

    const managementNumber = registerMatch[1]; // 2025d10
    const external_id = `niigata-city-${managementNumber}`;

    // タイトルから名前と年齢情報を取得
    // 例：「ずんだ (推定2歳)」
    const titleText = $li.find('h2.title').text().trim();
    let name = null;
    let ageEstimate = null;

    const titleMatch = titleText.match(/^([^\(]+)\s*\((.+)\)$/);
    if (titleMatch) {
      name = titleMatch[1].trim();
      const ageText = titleMatch[2]; // 例：「推定2歳」

      // 年齢推定情報を抽出
      ageEstimate = ageText;
    } else {
      name = titleText;
    }

    // 画像URL
    const images = [];
    const $img = $li.find('img');
    if ($img.length > 0) {
      const imgSrc = $img.attr('src');
      if (imgSrc) {
        images.push(imgSrc);
      }
    }

    // 詳細ページURL
    const detailUrl = href && href.startsWith('http') ? href : CONFIG.base_url + href;

    // 譲渡済み判定（タイトルやテキストから）
    const fullText = titleText + registerText;
    const status = getAdoptionStatus(fullText);

    const dog = {
      external_id,
      name,
      animal_type: 'dog',
      breed: null, // 詳細ページから取得が必要
      age_estimate: ageEstimate || null,
      gender: 'unknown',
      color: null,
      size: null,
      health_status: null,
      personality: null,
      special_needs: null,
      images,
      protection_date: null,
      deadline_date: null,
      status,
      source_url: detailUrl || CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [managementNumber],
      listing_type: 'adoption',
    };

    dogs.push(dog);

    console.log(`--- 犬 ${dogs.length} ---`);
    console.log(`   番号: ${managementNumber}`);
    console.log(`   愛称: ${name || '不明'}`);
    console.log(`   年齢: ${ageEstimate || '不明'}`);
    console.log(`   ステータス: ${status}`);
  });

  return dogs;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 新潟市動物愛護センター（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = extractDogInfoFromList($);

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
          note: '新潟市譲渡犬情報（いくとぴあ食花）',
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
