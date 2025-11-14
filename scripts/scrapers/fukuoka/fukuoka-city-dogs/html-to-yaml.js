#!/usr/bin/env node

/**
 * 福岡市動物愛護管理センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'fukuoka/fukuoka-city-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://zuttoissho.com',
  source_url: 'https://zuttoissho.com/omukae/animal/dog/',
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
 * HTMLパターン: <a href="/omukae/animal/dog/XXXX/">
 *   d1234【仮名：ポチ　申込者あり】
 *   2歳 雑種 茶
 *   去勢オス
 *   東部動物愛護管理センター
 * </a>
 */
function extractDogInfoFromList($) {
  const dogs = [];

  // d番号【】のパターンを持つリンクを検索
  $('a').each((index, elem) => {
    const $link = $(elem);
    const linkText = $link.text().trim();
    const href = $link.attr('href');

    // d番号で始まる犬情報をフィルタリング
    const dogIdMatch = linkText.match(/d(\d+)【(.+?)】/);
    if (!dogIdMatch) return;

    const dogNumber = dogIdMatch[1]; // d後の数字
    const titleText = dogIdMatch[2]; // 【】内のテキスト

    // 管理番号とexternal_id
    const managementNumber = `d${dogNumber}`;
    const external_id = `fukuoka-city-${managementNumber}`;

    // 【】内から仮名と申込者ありステータスを抽出
    let name = null;
    let hasApplicant = false;

    if (titleText.includes('申込者あり')) {
      hasApplicant = true;
    }

    const nameMatch = titleText.match(/仮名[：:]\s*([^\s　]+)/);
    if (nameMatch) {
      name = nameMatch[1];
    }

    // リンクテキストを行で分割して情報を抽出
    const lines = linkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    // 2行目: 年齢・品種・毛色（例：「2歳 雑種 茶」）
    let ageEstimate = null;
    let breed = null;
    let color = null;
    if (lines[1]) {
      const parts = lines[1].split(/\s+/);
      if (parts.length >= 1) ageEstimate = parts[0];
      if (parts.length >= 2) breed = parts[1];
      if (parts.length >= 3) color = parts.slice(2).join(' ');
    }

    // 3行目: 性別・去勢状況（例：「去勢オス」「不妊メス」）
    let gender = 'unknown';
    let isNeutered = false;
    if (lines[2]) {
      const genderText = lines[2];
      if (genderText.includes('オス') || genderText.includes('雄')) {
        gender = 'male';
      } else if (genderText.includes('メス') || genderText.includes('雌')) {
        gender = 'female';
      }
      if (genderText.includes('去勢') || genderText.includes('不妊')) {
        isNeutered = true;
      }
    }

    // 4行目: 施設名（例：「東部動物愛護管理センター」）
    let facility = null;
    if (lines[3]) {
      facility = lines[3];
    }

    // 譲渡済み判定（「申込者あり」をステータスに反映）
    const fullText = linkText;
    let status = getAdoptionStatus(fullText);

    // 「申込者あり」は pending（申込中）として扱う
    if (hasApplicant && status === 'available') {
      status = 'pending';
    }

    // 画像URL（リンク先ページから取得が必要なので、ここでは空）
    const images = [];
    if (href) {
      // 詳細ページのURLを画像URLとして記録（後で更新可能）
      const fullUrl = href.startsWith('http') ? href : CONFIG.base_url + href;
      images.push(fullUrl);
    }

    const dog = {
      external_id,
      name,
      animal_type: 'dog',
      breed: breed || null,
      age_estimate: ageEstimate || null,
      gender,
      color: color || null,
      size: null,
      health_status: isNeutered ? (gender === 'male' ? '去勢済み' : '不妊済み') : null,
      personality: null,
      special_needs: facility || null,
      images,
      protection_date: null,
      deadline_date: null,
      status,
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [hasApplicant ? '申込者あり' : '募集中'],
      listing_type: 'adoption',
    };

    dogs.push(dog);

    console.log(`--- 犬 ${dogs.length} ---`);
    console.log(`   番号: ${managementNumber}`);
    console.log(`   愛称: ${name || '不明'}`);
    console.log(`   性別: ${gender}`);
    console.log(`   毛色: ${color || '不明'}`);
    console.log(`   年齢: ${ageEstimate || '不明'}`);
    console.log(`   施設: ${facility || '不明'}`);
    console.log(`   ステータス: ${status} ${hasApplicant ? '(申込者あり)' : ''}`);
  });

  return dogs;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 福岡市動物愛護管理センター（犬） - YAML抽出');
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
          note: '福岡市譲渡犬情報（外部サイトzuttoissho.comより）',
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
