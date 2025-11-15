#!/usr/bin/env node

/**
 * 新潟県動物愛護センター（犬）HTML→YAML変換スクリプト
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'niigata/niigata-pref-dogs',
  htmlDir: 'data/html/niigata/niigata-pref-dogs',
  yamlDir: 'data/yaml/niigata/niigata-pref-dogs',
  sourceUrl: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1334350842609.html',
};

// ========================================
// 抽出ロジック
// ========================================

/**
 * HTMLから犬情報を抽出
 * - h3要素: 犬の名前
 * - 続く画像のalt: 管理番号や追加情報
 */
function extractDogInfo($) {
  const dogs = [];
  const processedNames = new Set();

  // h3要素を探す
  $('h3').each((index, elem) => {
    const $h3 = $(elem);
    const nameText = $h3
      .text()
      .trim()
      .replace(/\u200b/g, ''); // ゼロ幅スペース除去

    // 特殊な見出しを除外
    if (
      !nameText ||
      nameText.includes('愛護センター') ||
      nameText.includes('トップページ') ||
      nameText.includes('譲渡に関すること') ||
      nameText.includes('飼い主募集')
    ) {
      return;
    }

    // 既に処理済みの名前はスキップ
    if (processedNames.has(nameText)) {
      return;
    }
    processedNames.add(nameText);

    // 次の要素から画像を収集
    const images = [];
    let managementNumber = null;

    let $next = $h3.next();
    while ($next.length > 0 && !$next.is('h3')) {
      // p要素内の画像を探す
      $next.find('img').each((i, img) => {
        const imgUrl = $(img).attr('src');
        const altText = $(img).attr('alt') || '';

        if (imgUrl) {
          // 相対URLを絶対URLに変換
          const fullUrl = imgUrl.startsWith('http')
            ? imgUrl
            : `https://www.pref.niigata.lg.jp${imgUrl}`;
          images.push(fullUrl);

          // altから管理番号を抽出（例: "25長YD02-ゆきお-2", "24芝YD006　うめきち"）
          const mgmtMatch = altText.match(/(\d{2}[^\s-]+YD\d{3,4})/);
          if (mgmtMatch && !managementNumber) {
            managementNumber = mgmtMatch[1];
          }
        }
      });

      $next = $next.next();
      // 次のh3に到達したら終了
      if ($next.is('h3')) {
        break;
      }
    }

    // external_idを生成（管理番号または名前ベース）
    const external_id = managementNumber
      ? `niigata-pref-${managementNumber.toLowerCase()}`
      : `niigata-pref-dog-${nameText.toLowerCase()}`;

    dogs.push({
      external_id,
      name: nameText,
      animal_type: 'dog',
      breed: null,
      age_estimate: null,
      gender: 'unknown',
      color: null,
      size: null,
      health_status: null,
      personality: null,
      special_needs: null,
      images: images.slice(0, 5), // 最大5枚
      protection_date: null,
      deadline_date: null,
      status: 'available',
      source_url: CONFIG.sourceUrl,
      confidence_level: 'high',
      extraction_notes: managementNumber ? [managementNumber] : [],
      listing_type: 'adoption',
    });
  });

  return dogs;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのカウントを継承

  console.log('='.repeat(60));
  console.log(`🔄 HTML → YAML 変換: ${CONFIG.municipality}`);
  console.log('='.repeat(60));

  try {
    // 最新HTMLファイルを探す
    const htmlFiles = fs
      .readdirSync(CONFIG.htmlDir)
      .filter((f) => f.endsWith('.html') && f.includes('_tail'))
      .sort()
      .reverse();

    if (htmlFiles.length === 0) {
      throw new Error('HTMLファイルが見つかりません');
    }

    const latestHtmlFile = htmlFiles[0];
    const htmlPath = path.join(CONFIG.htmlDir, latestHtmlFile);

    console.log(`📂 読込: ${latestHtmlFile}`);

    // HTML読み込み
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(html);

    // 犬情報抽出
    const dogs = extractDogInfo($);

    console.log(`\n🐕 抽出結果: ${dogs.length}匹`);
    dogs.forEach((dog, i) => {
      console.log(`  ${i + 1}. ${dog.name} (${dog.external_id}) - 画像: ${dog.images.length}枚`);
    });

    // YAML生成
    const yamlData = {
      meta: {
        source_file: latestHtmlFile,
        source_url: CONFIG.sourceUrl,
        extracted_at: new Date().toISOString(),
        municipality: CONFIG.municipality,
        municipality_id: null,
        total_count: dogs.length,
        note: '新潟県動物愛護センター犬譲渡情報',
      },
      animals: dogs,
    };

    // YAML保存
    if (!fs.existsSync(CONFIG.yamlDir)) {
      fs.mkdirSync(CONFIG.yamlDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const yamlPath = path.join(CONFIG.yamlDir, `${timestamp}_tail.yaml`);

    fs.writeFileSync(yamlPath, yaml.dump(yamlData, { indent: 2, lineWidth: -1 }), 'utf-8');

    console.log(`\n✅ 保存完了: ${yamlPath}`);

    // YAML抽出後の動物数を記録
    logger.logYAMLCount(dogs.length);
    logger.finalize();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    logger.logError(error);
    logger.finalize();
    process.exit(1);
  }
}

main();
