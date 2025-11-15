#!/usr/bin/env node

/**
 * 水戸市動物愛護センター HTML→YAML変換スクリプト（犬）
 */

import * as cheerio from 'cheerio';
import { createLogger } from '../../../lib/history-logger.js';
import { getJSTTimestamp } from '../../../lib/timestamp.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ibaraki/mito-city-dogs',
  url: 'https://www.city.mito.lg.jp/site/doubutsuaigo/2041.html',
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐕 水戸市動物愛護センター - HTML→YAML変換（犬）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}\n`);

  try {
    // 最新のHTMLファイルを取得
    const htmlDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    const files = fs
      .readdirSync(htmlDir)
      .filter((f) => f.endsWith('.html'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('HTMLファイルが見つかりません。先にscrape.jsを実行してください。');
    }

    const htmlPath = path.join(htmlDir, files[0]);
    console.log(`📄 HTML読み込み: ${htmlPath}`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(html);

    // 犬情報をパース
    const dogs = parseDogs($);
    console.log(`🔍 検出: ${dogs.length}匹の犬\n`);

    logger.logYAMLCount(dogs.length);

    // YAML生成
    const yamlData = {
      source: {
        municipality: CONFIG.municipality,
        url: CONFIG.url,
        scraped_at: new Date().toISOString(),
        note: '水戸市動物愛護センター「あにまるっとみと」',
      },
      dogs: dogs,
    };

    // 保存先ディレクトリ作成
    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    // YAML保存
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_tail.yaml`;
    const filepath = path.join(outputDir, filename);

    const yamlContent = yaml.dump(yamlData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    fs.writeFileSync(filepath, yamlContent, 'utf-8');
    console.log(`💾 YAML保存完了: ${filepath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTML→YAML変換完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    logger.finalize();
  }
}

/**
 * 犬情報をパース
 */
function parseDogs($) {
  const dogs = [];

  // テーブルを探す
  $('table').each((i, table) => {
    const $table = $(table);

    // 管理番号の行を探す（2列レイアウト対応）
    const $managementCells = $table.find('th:contains("管理番号")');
    if ($managementCells.length === 0) return;

    // 各管理番号セルに対して処理
    $managementCells.each((j, th) => {
      const $th = $(th);
      const $td = $th.next('td');
      if ($td.length === 0) return;

      const managementText = $td.text().trim();

      // 犬の形式:
      // 1. R7-39（名前：ショウ）
      // 2. R7-43（イチロー）
      const managementMatch = managementText.match(
        /R?(\d+)-(\d+)\s*[（(](?:名前[:：\s]*)?(.+?)[）)]/
      );

      if (!managementMatch) return;

      const id = managementMatch[2]; // 2番目のグループ（39など）
      const name = managementMatch[3].trim();

      // この管理番号と同じ列のデータを取得
      // $thの親行から、同じ列のthを探す
      const $row = $th.parent();
      const thIndex = $row.find('th').index($th);

      // 列のインデックスを使って同じ列のデータを取得する関数
      const getFieldValue = (fieldName) => {
        const $fieldRow = $table.find(`th:contains("${fieldName}")`).parent();
        if ($fieldRow.length === 0) return '';

        const $ths = $fieldRow.find('th');
        let targetTd = null;

        $ths.each((k, fieldTh) => {
          const $fieldTh = $(fieldTh);
          if ($fieldTh.text().includes(fieldName)) {
            // 同じ列のtdを探す
            const $tds = $fieldRow.find('td');
            if (thIndex === 0) {
              // 左列
              targetTd = $tds.first();
            } else {
              // 右列
              targetTd = $tds.last();
            }
          }
        });

        return targetTd ? $(targetTd).text().trim() : '';
      };

      // 毛色
      const color = getFieldValue('毛色') || '不明';

      // 性別
      const genderText = getFieldValue('性別');
      let gender = 'unknown';
      if (genderText.includes('メス') || genderText.includes('雌')) {
        gender = 'female';
      } else if (genderText.includes('オス') || genderText.includes('雄')) {
        gender = 'male';
      }

      // 体格（体重）
      const sizeText = getFieldValue('体格');
      const weightMatch = sizeText.match(/([0-9.]+)\s*kg/);
      const weight = weightMatch ? weightMatch[1] + 'kg' : '不明';

      // 年齢
      const ageText = getFieldValue('年齢');
      const ageMatch = ageText.match(/(\d+)才/);
      let age = 'adult';
      if (ageMatch) {
        const years = parseInt(ageMatch[1]);
        if (years < 1) {
          age = 'kitten';
        } else if (years >= 7) {
          age = 'senior';
        }
      }

      // ワクチン情報
      const vaccineText = getFieldValue('ワクチン');

      // 特徴
      const features = getFieldValue('特徴');

      // 画像（この列の画像のみ）
      const images = [];
      $table.find('img').each((k, img) => {
        const src = $(img).attr('src');
        const alt = $(img).attr('alt') || '';
        if (src && src.includes('/uploaded/image/') && alt.includes(id)) {
          const fullUrl = src.startsWith('http') ? src : `https://www.city.mito.lg.jp${src}`;
          images.push(fullUrl);
        }
      });

      const dog = {
        external_id: `mito-city-dog-${id}`,
        name: name,
        gender: gender,
        age: age,
        breed: '雑種',
        color: color,
        features: features || `体重: ${weight}`,
        location: '水戸市動物愛護センター',
        received_date: '',
        status: 'available',
        image_url: images.length > 0 ? images[0] : null,
        notes: `${vaccineText ? 'ワクチン: ' + vaccineText : ''}`.trim(),
      };

      dogs.push(dog);
    });
  });

  return dogs;
}

// ========================================
// 実行
// ========================================

main();
