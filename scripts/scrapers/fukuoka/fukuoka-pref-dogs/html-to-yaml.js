#!/usr/bin/env node

/**
 * 福岡県動物愛護センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'fukuoka/fukuoka-pref-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.zaidan-fukuoka-douai.or.jp',
  source_url: 'https://www.zaidan-fukuoka-douai.or.jp/animals/centers/dog',
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
 * HTMLパターン: <a href="/animals/center-detail/[UUID]">
 *   <div class="animals-data">
 *     <p class="no-data">No.4626</p>
 *     <dl><dt>性別</dt><dd>オス</dd></dl>
 *     <dl><dt>登録日</dt><dd>2025年10月29日</dd></dl>
 *     ...
 *   </div>
 * </a>
 */
function extractDogInfoFromList($) {
  const dogs = [];

  // /animals/center-detail/ へのリンクを検索
  $('a[href*="/animals/center-detail/"]').each((index, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');

    // UUID抽出
    const uuidMatch = href.match(/\/animals\/center-detail\/([a-f0-9-]+)/);
    if (!uuidMatch) return;

    const animalUUID = uuidMatch[1];
    const external_id = `fukuoka-pref-${animalUUID}`;

    // No.番号を取得
    const managementNumber = $link.find('.no-data').text().trim();

    // ステータスを取得（募集中など）
    const statusElement = $link.find('.ico-animal');
    const statusText = statusElement.text().trim();

    // dl/dt/dd構造から情報を抽出
    let gender = 'unknown';
    let registrationDate = null;
    let ageEstimate = null;
    let birthEstimate = null;
    let size = null;
    let weight = null;

    $link.find('dl').each((i, dl) => {
      const $dl = $(dl);
      const label = $dl.find('dt').text().trim();
      const value = $dl.find('dd').text().trim();

      if (label.includes('性別')) {
        if (value.includes('オス') || value.includes('雄')) {
          gender = 'male';
        } else if (value.includes('メス') || value.includes('雌')) {
          gender = 'female';
        }
      } else if (label.includes('登録日')) {
        registrationDate = value;
      } else if (label.includes('推定年齢')) {
        // 「3ヵ月以下 (２０２５年８月７日頃)」のような形式
        const ageMatch = value.match(/^([^\(]+)/);
        if (ageMatch) {
          ageEstimate = ageMatch[1].trim();
        }
        const birthMatch = value.match(/\(([^\)]+)\)/);
        if (birthMatch) {
          birthEstimate = birthMatch[1].trim();
        }
      } else if (label.includes('大きさ') || label.includes('体重')) {
        // 「小型 (2.5kg)」のような形式、または「小型」のみ
        const sizeMatch = value.match(/^([^\(]+)/);
        if (sizeMatch) {
          size = sizeMatch[1].trim();
        }
        const weightMatch = value.match(/\(([^\)]+)\)/);
        if (weightMatch) {
          weight = weightMatch[1].trim();
        }
      }
    });

    // 画像URL（詳細ページから取得可能だが、ここでは詳細ページURLを記録）
    const images = [];
    if (href) {
      const fullUrl = href.startsWith('http') ? href : CONFIG.base_url + href;
      images.push(fullUrl);
    }

    // 譲渡済み判定
    const status = getAdoptionStatus(statusText);

    const dog = {
      external_id,
      name: managementNumber || animalUUID, // 名前がない場合はUUIDを使用
      animal_type: 'dog',
      breed: null,
      age_estimate: ageEstimate || null,
      gender,
      color: null,
      size: size || null,
      health_status: weight || null,
      personality: null,
      special_needs: birthEstimate ? `推定生年月日: ${birthEstimate}` : null,
      images,
      protection_date: registrationDate || null,
      deadline_date: null,
      status,
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [statusText || '募集中'],
      listing_type: 'adoption',
    };

    dogs.push(dog);

    console.log(`--- 犬 ${dogs.length} ---`);
    console.log(`   番号: ${managementNumber || animalUUID}`);
    console.log(`   性別: ${gender}`);
    console.log(`   年齢: ${ageEstimate || '不明'}`);
    console.log(`   体サイズ: ${size || '不明'}`);
    console.log(`   体重: ${weight || '不明'}`);
    console.log(`   登録日: ${registrationDate || '不明'}`);
    console.log(`   ステータス: ${status} (${statusText})`);
  });

  return dogs;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 福岡県動物愛護センター（犬） - YAML抽出');
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
          note: '福岡県動物愛護センター譲渡犬情報（公益財団法人運営）',
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
