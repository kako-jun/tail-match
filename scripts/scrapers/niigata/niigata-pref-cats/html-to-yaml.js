#!/usr/bin/env node

/**
 * 新潟県動物愛護センター（猫）HTML→YAML変換スクリプト
 * 成猫＋子猫の2ページを統合
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
  municipality: 'niigata/niigata-pref-cats',
  htmlDir: 'data/html/niigata/niigata-pref-cats',
  yamlDir: 'data/yaml/niigata/niigata-pref-cats',
  sourceUrls: {
    adults: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1334350843426.html',
    kittens: 'https://www.pref.niigata.lg.jp/sec/seikatueisei/1344055708060.html',
  },
};

// ========================================
// 抽出ロジック
// ========================================

/**
 * HTMLから猫情報を抽出
 * - h3要素: 飼育場所（16b、18a、3段ケージなど）
 * - 続く画像のalt: 猫の名前または管理番号
 */
function extractCatInfo($, sourceUrl, isKitten = false) {
  const cats = [];
  const processedLocations = new Set();

  // h3要素を探す
  $('h3').each((index, elem) => {
    const $h3 = $(elem);
    const locationText = $h3
      .text()
      .trim()
      .replace(/\u200b/g, ''); // ゼロ幅スペース除去

    // 特殊な見出しを除外
    if (
      !locationText ||
      locationText.includes('愛護センター') ||
      locationText.includes('トップページ') ||
      locationText.includes('譲渡に関すること') ||
      locationText.includes('飼い主募集') ||
      locationText.includes('知っておきたいこと') ||
      locationText.includes('他の保護施設') ||
      locationText.includes('動画はこちら')
    ) {
      return;
    }

    // 既に処理済みの場所はスキップ
    if (processedLocations.has(locationText)) {
      return;
    }
    processedLocations.add(locationText);

    // 次の要素から画像を収集
    const images = [];
    let catName = null;
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

          // altから猫の名前を抽出
          // パターン1: ひらがな・カタカナの名前（例: "しゃけ"、"おかか"、"ポッキー"）
          // パターン2: 管理番号（例: "25芝YC052②"）
          if (altText && !catName) {
            // ひらがな・カタカナのみの場合は名前
            if (/^[ぁ-んァ-ヶー]+$/.test(altText)) {
              catName = altText;
            }
            // 管理番号パターン
            else if (/\d{2}[^\s]+YC\d{3,4}/.test(altText)) {
              const mgmtMatch = altText.match(/(\d{2}[^\s]+YC\d{3,4})/);
              if (mgmtMatch) {
                managementNumber = mgmtMatch[1];
              }
            }
          }
        }
      });

      $next = $next.next();
      // 次のh3に到達したら終了
      if ($next.is('h3')) {
        break;
      }
    }

    // 猫の名前が見つからない場合は飼育場所を名前にする
    if (!catName) {
      catName = locationText;
    }

    // external_idを生成
    const external_id = managementNumber
      ? `niigata-pref-${managementNumber.toLowerCase()}`
      : `niigata-pref-cat-${locationText.replace(/\s+/g, '-').toLowerCase()}`;

    cats.push({
      external_id,
      name: catName,
      animal_type: 'cat',
      breed: null,
      age_estimate: isKitten ? '子猫' : null,
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
      source_url: sourceUrl,
      confidence_level: 'high',
      extraction_notes: managementNumber
        ? [managementNumber, `飼育場所: ${locationText}`]
        : [`飼育場所: ${locationText}`],
      listing_type: 'adoption',
    });
  });

  return cats;
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
    const allCats = [];

    // 成猫HTMLファイルを処理
    const adultFiles = fs
      .readdirSync(CONFIG.htmlDir)
      .filter((f) => f.endsWith('_adults.html'))
      .sort()
      .reverse();

    if (adultFiles.length > 0) {
      const adultFile = adultFiles[0];
      const adultPath = path.join(CONFIG.htmlDir, adultFile);
      console.log(`📂 読込: ${adultFile} (成猫)`);

      const adultHtml = fs.readFileSync(adultPath, 'utf-8');
      const $adult = cheerio.load(adultHtml);
      const adultCats = extractCatInfo($adult, CONFIG.sourceUrls.adults, false);

      console.log(`  🐱 抽出: ${adultCats.length}匹`);
      allCats.push(...adultCats);
    }

    // 子猫HTMLファイルを処理
    const kittenFiles = fs
      .readdirSync(CONFIG.htmlDir)
      .filter((f) => f.endsWith('_kittens.html'))
      .sort()
      .reverse();

    if (kittenFiles.length > 0) {
      const kittenFile = kittenFiles[0];
      const kittenPath = path.join(CONFIG.htmlDir, kittenFile);
      console.log(`\n📂 読込: ${kittenFile} (子猫)`);

      const kittenHtml = fs.readFileSync(kittenPath, 'utf-8');
      const $kitten = cheerio.load(kittenHtml);
      const kittenCats = extractCatInfo($kitten, CONFIG.sourceUrls.kittens, true);

      console.log(`  🐱 抽出: ${kittenCats.length}匹`);
      allCats.push(...kittenCats);
    }

    console.log(`\n🐈 全体の抽出結果: ${allCats.length}匹`);
    allCats.forEach((cat, i) => {
      console.log(
        `  ${i + 1}. ${cat.name} (${cat.external_id}) - 画像: ${cat.images.length}枚 ${cat.age_estimate ? `[${cat.age_estimate}]` : ''}`
      );
    });

    // YAML生成
    const yamlData = {
      meta: {
        source_file: 'adults + kittens',
        source_url: `${CONFIG.sourceUrls.adults}, ${CONFIG.sourceUrls.kittens}`,
        extracted_at: new Date().toISOString(),
        municipality: CONFIG.municipality,
        municipality_id: null,
        total_count: allCats.length,
        note: '新潟県動物愛護センター猫譲渡情報（成猫＋子猫）',
      },
      animals: allCats,
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
    logger.logYAMLCount(allCats.length);
    logger.finalize();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    logger.logError(error);
    logger.finalize();
    process.exit(1);
  }
}

main();
