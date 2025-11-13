#!/usr/bin/env node

/**
 * 広島県動物愛護センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'hiroshima/hiroshima-pref-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.pref.hiroshima.lg.jp',
  source_url: 'https://www.pref.hiroshima.lg.jp/site/apc/jouto-rebreed-dog-list.html',
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

function extractDogInfo($, $h2, index) {
  const heading = $h2.text().trim();
  // 例: 管理番号　1HD20250002（109）or 管理番号：1HD20250178 (112) or 管理番号：20250199(13)
  // Pattern handles: 管理番号[：　] [1HD]番号 [　][(（]番号[)）]
  const match = heading.match(/管理番号[：　\s]+(1HD\d+|\d{8,})[　\s]*[（(]?(\d+)[)）]/);
  if (!match) return null;

  const managementNumber = match[1]; // 1HD20250002 or 20250199
  const displayNumber = match[2]; // 109 or 13
  const external_id = `hiroshima-pref-${managementNumber}`;
  const name = displayNumber; // Use display number as name

  // トライアル中かどうか
  const isOnTrial = heading.includes('トライアル中');
  const status = isOnTrial ? 'reserved' : 'available'; // トライアル中は reserved

  // 次のp要素（画像）
  let $p = $h2.next('p');
  const images = [];
  $p.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
    }
  });

  // その次のp要素（詳細情報）
  $p = $p.next('p');
  const detailsHtml = $p.html() || '';
  const detailsLines = detailsHtml
    .split(/<br\s*\/?>/i)
    .map((line) => $(load(line).root()).text().trim())
    .filter((line) => line.length > 0);

  let gender = 'unknown';
  let age_estimate = null;
  let health_status = '';
  let debut_date = null;
  let special_needs = null;
  let breed = null;
  let size = null;

  for (const line of detailsLines) {
    // 犬種・性別・体重（例: 柴犬、雌（避妊済）、推定１歳、体重15kg）
    if (
      line.includes('雌') ||
      line.includes('雄') ||
      line.includes('メス') ||
      line.includes('オス')
    ) {
      if (line.includes('雌') || line.includes('メス')) {
        gender = 'female';
      } else if (line.includes('雄') || line.includes('オス')) {
        gender = 'male';
      }

      // 年齢抽出（例: 推定１歳、推定５か月、推定2.5か月、高齢）
      const ageMatch = line.match(/推定([０-９0-9]+)歳/);
      const monthMatch = line.match(/推定([０-９0-9.]+)[かヶ]月/);
      if (ageMatch) {
        // 全角数字を半角に変換
        const age = ageMatch[1].replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0)
        );
        age_estimate = `推定${age}歳`;
      } else if (monthMatch) {
        const months = monthMatch[1].replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0)
        );
        age_estimate = `推定${months}ヶ月`;
      } else if (line.includes('高齢')) {
        age_estimate = '高齢';
      }

      // 体重抽出（例: 体重15kg、15kg）
      const weightMatch = line.match(/([0-9０-９.]+)\s?kg/i);
      if (weightMatch) {
        const weight = weightMatch[1].replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0)
        );
        size = `${weight}kg`;
      }
    }

    // 健康状態（フィラリア検査結果など）
    if (line.includes('フィラリア検査')) {
      health_status += (health_status ? '、' : '') + line;
    }

    // デビュー日
    if (line.includes('デビュー日')) {
      const debutMatch = line.match(/デビュー日[：:]\s*(.+)/);
      if (debutMatch) {
        debut_date = debutMatch[1].trim();
      }
    }

    // トライアル可能情報
    if (line.includes('トライアル')) {
      special_needs = (special_needs ? special_needs + '。' : '') + line;
    }
  }

  return {
    external_id,
    name,
    animal_type: 'dog',
    breed,
    age_estimate,
    gender,
    color: null,
    size,
    health_status: health_status || null,
    personality: null,
    special_needs,
    images,
    protection_date: null,
    deadline_date: null,
    status,
    source_url: CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: [isOnTrial ? 'トライアル中' : '譲渡対象犬'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 広島県動物愛護センター（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];
    $('h2').each((index, h2) => {
      const $h2 = $(h2);
      // 広島県のパターン: 管理番号　1HD20250002（109）or 管理番号：20250199(13)
      if ($h2.text().match(/管理番号[：　\s]+(1HD\d+|\d{8,})/)) {
        const dog = extractDogInfo($, $h2, index);
        if (dog) {
          allDogs.push(dog);
          console.log(`--- 犬 ${allDogs.length} ---`);
          console.log(`   管理番号: ${dog.external_id}`);
          console.log(`   性別: ${dog.gender}`);
          console.log(`   年齢: ${dog.age_estimate || '不明'}`);
          console.log(`   体重: ${dog.size || '不明'}`);
          console.log(`   画像: ${dog.images.length}枚`);
          console.log(`   ステータス: ${dog.status}`);
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
          note: '譲渡対象犬情報',
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
