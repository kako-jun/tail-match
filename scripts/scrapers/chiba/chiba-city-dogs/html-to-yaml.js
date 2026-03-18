#!/usr/bin/env node

/**
 * 千葉市動物保護指導センター（犬） YAML抽出スクリプト
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
  municipality: 'chiba/chiba-city-dogs',
  base_url: 'https://www.city.chiba.jp',
  source_url:
    'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seikatsueisei/dobutsuhogo/transferdogs.html',
};

// ========================================
// ユーティリティ
// ========================================

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

function parseGender(text) {
  if (!text) return 'unknown';
  text = text.toLowerCase();
  if (text.includes('オス') || text.includes('雄') || text.includes('♂')) return 'male';
  if (text.includes('メス') || text.includes('雌') || text.includes('♀')) return 'female';
  return 'unknown';
}

/**
 * h4見出し + 後続p要素から犬情報を抽出
 * HTML構造: <h4>26011901（チャオ）</h4> → <p><img ...></p> → <p>種類：柴犬<br>毛色：茶<br>...</p>
 */
function extractDogInfo($, h4Element, index) {
  const h4Text = $(h4Element).text().trim();

  // h4から管理番号と愛称を抽出
  let external_id = null;
  let name = null;

  const idMatch = h4Text.match(/(\d{8,})/);
  if (idMatch) {
    external_id = idMatch[1];
  }
  const nameMatch = h4Text.match(/[（(](.+?)[）)]/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  if (!external_id) {
    external_id = `chiba-city-dog-${index}`;
  }

  // h4の後続p要素からデータを収集
  let breed = null;
  let age_estimate = null;
  let gender = 'unknown';
  let color = null;
  let personality = null;
  const images = [];
  let detailText = '';

  let $next = $(h4Element).next();
  while (
    $next.length &&
    $next.prop('tagName') !== 'H4' &&
    $next.prop('tagName') !== 'H2' &&
    $next.prop('tagName') !== 'H3'
  ) {
    // 画像を抽出
    $next.find('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
      }
    });

    const text = $next.text().trim();
    if (text) {
      detailText += ' ' + text;
      // br区切りの各行を解析
      const lines = text.split(/\n/);
      for (const line of lines) {
        const l = line.trim();
        if (l.match(/^種類[：:]/)) {
          breed = l.replace(/^種類[：:]/, '').trim();
        } else if (l.match(/^毛色[：:]/)) {
          color = l.replace(/^毛色[：:]/, '').trim();
        } else if (l.match(/^性別[：:]/)) {
          gender = parseGender(l);
        } else if (l.match(/^年齢[：:]/)) {
          age_estimate = l.replace(/^年齢[：:]/, '').trim();
        } else if (l.match(/^コメント[：:]/)) {
          personality = l.replace(/^コメント[：:]/, '').trim();
        }
      }
    }

    $next = $next.next();
  }

  // 譲渡済み判定
  const status = getAdoptionStatus(detailText);

  return {
    external_id,
    name,
    animal_type: 'dog',
    breed,
    age_estimate,
    gender,
    color,
    size: null,
    health_status: null,
    personality,
    special_needs: null,
    images,
    protection_date: null,
    status: status,
    source_url: CONFIG.source_url,
    confidence_level: 'medium',
    extraction_notes: [],
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 千葉市動物保護指導センター（犬） - YAML抽出');
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

    const allDogs = [];

    // 「譲渡可能な犬たち」セクション内のh4要素を検索
    // HTML構造: <h2>譲渡可能な犬たち</h2> → <h4>26011901（チャオ）</h4> → <p>...</p>
    $('h4').each((index, element) => {
      const text = $(element).text().trim();
      // 管理番号パターン（8桁以上の数字）を含むh4のみ対象
      if (text.match(/\d{8,}/)) {
        const dog = extractDogInfo($, element, index);
        if (dog.external_id) {
          allDogs.push(dog);
        }
      }
    });

    console.log(`📊 検出した犬数: ${allDogs.length}`);

    if (allDogs.length === 0) {
      console.warn('⚠️ 犬情報が見つかりませんでした');
      return;
    }

    allDogs.forEach((dog, index) => {
      console.log(`\n--- 犬 ${index + 1}/${allDogs.length} ---`);
      console.log(`   ID: ${dog.external_id}`);
      console.log(`   名前: ${dog.name || '不明'}, 性別: ${dog.gender}`);
    });

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
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: 18, // 千葉市動物保護指導センター
          total_count: allDogs.length,
        },
        animals: allDogs,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    logger.finalize(); // 履歴を保存

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
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
