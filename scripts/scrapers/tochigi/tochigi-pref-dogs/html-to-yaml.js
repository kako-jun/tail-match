#!/usr/bin/env node

/**
 * 栃木県動物愛護指導センター（犬） YAML抽出スクリプト
 *
 * 特徴:
 * - テーブル形式（管理番号 R7-XXXX）
 * - 縦型テーブル: 番号/性別/年齢/ワクチン等/画像/特徴
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'tochigi/tochigi-pref-dogs',
  base_url: 'https://www.douai.pref.tochigi.lg.jp',
  source_url: 'https://www.douai.pref.tochigi.lg.jp/work/dog/',
};

// ========================================
// ユーティリティ
// ========================================

/**
 * 最新のHTMLファイルを取得
 */
function getLatestHtmlFile() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(htmlDir)) {
    throw new Error(`HTMLディレクトリが見つかりません: ${htmlDir}`);
  }

  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('_tail.html'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('HTMLファイルが見つかりません');
  }

  return path.join(htmlDir, files[0]);
}

/**
 * 性別情報をパース
 */
function parseGender(genderText) {
  const trimmed = genderText.trim();
  if (trimmed.includes('メス')) return 'female';
  if (trimmed.includes('オス')) return 'male';
  return 'unknown';
}

/**
 * 犬情報を抽出
 */
function extractDogs($) {
  const dogs = [];

  // テーブルを走査（flexible-table-block-table クラスのテーブル）
  $('figure.wp-block-flexible-table-block-table table').each((i, table) => {
    const $table = $(table);
    const rows = $table.find('tbody tr');

    if (rows.length < 5) {
      return; // データ不足
    }

    // Row 0: 番号
    const row0 = $(rows[0]);
    const numberLabel = row0.find('td').eq(0).text().trim();
    const managementNumber = row0.find('td').eq(1).text().trim();

    if (!managementNumber.match(/R7-\d+/)) {
      return; // 管理番号パターンに一致しない
    }

    // Row 1: 性別
    const row1 = $(rows[1]);
    const genderText = row1.find('td').eq(1).text().trim();
    const gender = parseGender(genderText);

    // Row 2: 年齢
    const row2 = $(rows[2]);
    const age = row2.find('td').eq(1).text().trim();

    // Row 3: ワクチン等
    const row3 = $(rows[3]);
    const vaccine = row3.find('td').eq(1).text().trim();

    // Row 4: 画像
    const row4 = $(rows[4]);
    const images = [];
    row4.find('img').each((j, img) => {
      const src = $(img).attr('src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
        images.push(fullUrl);
      }
    });

    // Row 5: 特徴
    const row5 = $(rows[5]);
    const personality = row5.find('td').eq(1).text().trim();

    // 譲渡済み判定（管理番号から）
    const status = getAdoptionStatus(managementNumber);

    dogs.push({
      external_id: managementNumber,
      name: null, // 名前情報なし
      animal_type: 'dog',
      breed: null, // 品種情報なし
      age_estimate: age,
      gender: gender,
      color: null,
      size: null,
      health_status: vaccine,
      personality: personality,
      special_needs: null,
      images: images,
      protection_date: null,
      deadline_date: null,
      status: status,
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [`ワクチン: ${vaccine}`],
    });
  });

  return dogs;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);

  try {
    console.log('='.repeat(60));
    console.log('🐕 栃木県動物愛護指導センター（犬） - YAML抽出');
    console.log('='.repeat(60));
    console.log(`   Municipality: ${CONFIG.municipality}`);
    console.log('='.repeat(60) + '\n');

    // HTMLファイル読み込み
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 HTMLファイル読み込み: ${path.basename(htmlPath)}`);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // 犬情報抽出
    console.log('🔍 犬情報を抽出中...');
    const dogs = extractDogs($);

    // ロガーにYAMLカウントを記録
    logger.logYAMLCount(dogs.length);

    console.log(`✅ 抽出完了: ${dogs.length}匹`);

    if (dogs.length === 0) {
      console.log('⚠️  譲渡可能な犬が見つかりませんでした');
    } else {
      dogs.forEach((dog, index) => {
        console.log(
          `   ${index + 1}. ${dog.external_id} - ${dog.gender === 'male' ? 'オス' : dog.gender === 'female' ? 'メス' : '不明'}, ${dog.age_estimate}`
        );
      });
    }

    // YAML生成
    const timestamp = getJSTTimestamp();
    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          total_count: dogs.length,
        },
        animals: dogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    // YAML保存
    const yamlDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(yamlDir, { recursive: true });

    const yamlFilename = `${timestamp}_tail.yaml`;
    const yamlPath = path.join(yamlDir, yamlFilename);

    fs.writeFileSync(yamlPath, yamlContent, 'utf-8');
    console.log(`\n💾 YAML保存完了: ${yamlPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
