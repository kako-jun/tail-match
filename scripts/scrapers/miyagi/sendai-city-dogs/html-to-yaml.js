#!/usr/bin/env node

/**
 * 仙台市動物管理センター「アニパル仙台」（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'miyagi/sendai-city-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.city.sendai.jp',
  source_url: 'https://www.city.sendai.jp/dobutsu/kurashi/shizen/petto/hogodobutsu/joho/inu.html',
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
 * 情報テーブルと写真テーブルから犬情報を抽出
 */
function extractCatInfoFromTables($) {
  const cats = {};
  const images = {};

  // 全てのtable.datatableを走査
  $('table.datatable').each((tableIndex, table) => {
    const $table = $(table);
    const caption = $table.find('caption').text().trim();

    if (caption.includes('譲渡犬の情報')) {
      // 情報テーブル処理（犬は7列: 管理番号、種類、性別、年齢、体格、毛色、その他）
      $table.find('tbody > tr').each((rowIndex, tr) => {
        const $tr = $(tr);
        const $tds = $tr.find('td');

        if ($tds.length < 7) return; // ヘッダー行をスキップ

        const managementNumber = $tds.eq(0).text().trim();
        if (!managementNumber.match(/^D\d{5}$/)) return;

        const breed = $tds.eq(1).text().trim();
        const genderText = $tds.eq(2).text().trim();
        const age_estimate = $tds.eq(3).text().trim();
        const size = $tds.eq(4).text().trim();
        const color = $tds.eq(5).text().trim();
        const otherInfo = $tds.eq(6).html() || '';

        // 性別判定
        let gender = 'unknown';
        if (genderText.includes('去勢') || genderText.includes('オス')) {
          gender = 'male';
        } else if (genderText.includes('避妊') || genderText.includes('メス')) {
          gender = 'female';
        }

        // その他情報から健康状態と性格を抽出
        const otherText = otherInfo.replace(/<br>/gi, '\n').replace(/<[^>]+>/g, '');
        const lines = otherText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l);

        let health_status = null;
        let personality = [];

        lines.forEach((line) => {
          if (
            line.includes('白血病') ||
            line.includes('エイズ') ||
            line.includes('ワクチン') ||
            line.includes('マイクロチップ')
          ) {
            health_status = health_status ? health_status + '。' + line : line;
          } else if (!line.includes('&nbsp;')) {
            personality.push(line);
          }
        });

        // 譲渡済み判定
        const fullText = otherText + ' ' + managementNumber;
        const status = getAdoptionStatus(fullText);

        cats[managementNumber] = {
          external_id: `sendai-city-${managementNumber}`,
          name: managementNumber,
          animal_type: 'dog',
          breed: breed === '雑種' || breed === 'ミックス' ? null : breed,
          age_estimate,
          gender,
          color,
          size,
          health_status,
          personality: personality.join('。') || null,
          special_needs: null,
          images: [],
          protection_date: null,
          deadline_date: null,
          status,
          source_url: CONFIG.source_url,
          confidence_level: 'high',
          extraction_notes: ['譲渡対象犬'],
          listing_type: 'adoption',
        };
      });
    } else if (caption.includes('譲渡犬の写真')) {
      // 写真テーブル処理
      $table.find('tbody > tr').each((rowIndex, tr) => {
        const $tr = $(tr);
        const $tds = $tr.find('td');

        if ($tds.length < 2) return; // ヘッダー行をスキップ

        const managementNumber = $tds.eq(0).text().trim();
        if (!managementNumber.match(/^D\d{5}$/)) return;

        const imageUrls = [];
        $tds.slice(1).each((i, td) => {
          const $img = $(td).find('img');
          if ($img.length > 0) {
            const src = $img.attr('src');
            if (src) {
              imageUrls.push(src.startsWith('http') ? src : CONFIG.base_url + src);
            }
          }
        });

        images[managementNumber] = imageUrls;
      });
    }
  });

  // 画像を対応する犬情報にマージ
  Object.keys(images).forEach((managementNumber) => {
    if (cats[managementNumber]) {
      cats[managementNumber].images = images[managementNumber];
    }
  });

  return Object.values(cats);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 仙台市動物管理センター「アニパル仙台」（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allCats = extractCatInfoFromTables($);

    allCats.forEach((cat, index) => {
      console.log(`--- 犬 ${index + 1} ---`);
      console.log(`   管理番号: ${cat.name}`);
      console.log(`   性別: ${cat.gender}`);
      console.log(`   毛色: ${cat.color || '不明'}`);
      console.log(`   画像: ${cat.images.length}枚`);
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
          note: '譲渡対象犬情報',
        },
        animals: allCats,
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
