#!/usr/bin/env node

/**
 * 栃木県動物愛護指導センター（猫） YAML抽出スクリプト
 *
 * 特徴:
 * - テーブル形式（Aケージ、番号：X）
 * - 4行構成: Aケージ/番号/画像/性別
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
  municipality: 'tochigi/tochigi-pref-cats',
  base_url: 'https://www.douai.pref.tochigi.lg.jp',
  source_url: 'https://www.douai.pref.tochigi.lg.jp/work/kitten/',
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
 * 猫情報を抽出
 */
function extractCats($) {
  const cats = [];

  // テーブルを走査
  $('figure.wp-block-flexible-table-block-table table').each((i, table) => {
    const $table = $(table);
    const rows = $table.find('tbody tr');

    if (rows.length < 4) {
      return; // データ不足
    }

    // Row 0: Aケージ
    const row0 = $(rows[0]);
    const cageLabel = row0.find('td').text().trim();

    if (!cageLabel.includes('Aケージ') && !cageLabel.includes('ケージ')) {
      return; // Aケージパターンに一致しない
    }

    // Row 1: 番号
    const row1 = $(rows[1]);
    const numberText = row1.find('td').text().trim();
    // 全角数字を半角に変換
    const normalized = numberText.replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const numberMatch = normalized.match(/番号[：:]\s*(\d+)/);
    const externalId = numberMatch ? `A-${numberMatch[1]}` : null;

    // Row 2: 画像
    const row2 = $(rows[2]);
    const images = [];
    row2.find('img').each((j, img) => {
      const src = $(img).attr('src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
        images.push(fullUrl);
      }
    });

    // Row 3: 性別
    const row3 = $(rows[3]);
    const genderText = row3.find('td').text().trim();
    const gender = parseGender(genderText);

    // 譲渡済み判定
    const status = getAdoptionStatus(cageLabel + numberText + genderText);

    cats.push({
      external_id: externalId,
      name: null, // 名前情報なし
      animal_type: 'cat',
      breed: null, // 品種情報なし
      age_estimate: null, // 年齢情報なし
      gender: gender,
      color: null,
      size: null,
      health_status: null,
      personality: null,
      special_needs: null,
      images: images,
      protection_date: null,
      deadline_date: null,
      status: status,
      source_url: CONFIG.source_url,
      confidence_level: 'medium',
      extraction_notes: [`ケージ: ${cageLabel}`],
    });
  });

  return cats;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);

  try {
    console.log('='.repeat(60));
    console.log('🐱 栃木県動物愛護指導センター（猫） - YAML抽出');
    console.log('='.repeat(60));
    console.log(`   Municipality: ${CONFIG.municipality}`);
    console.log('='.repeat(60) + '\n');

    // HTMLファイル読み込み
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 HTMLファイル読み込み: ${path.basename(htmlPath)}`);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // 猫情報抽出
    console.log('🔍 猫情報を抽出中...');
    const cats = extractCats($);

    // ロガーにYAMLカウントを記録
    logger.logYAMLCount(cats.length);

    console.log(`✅ 抽出完了: ${cats.length}匹`);

    if (cats.length === 0) {
      console.log('⚠️  譲渡可能な猫が見つかりませんでした');
    } else {
      cats.forEach((cat, index) => {
        console.log(
          `   ${index + 1}. ${cat.external_id} - ${cat.gender === 'male' ? 'オス' : cat.gender === 'female' ? 'メス' : '不明'}`
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
          total_count: cats.length,
        },
        animals: cats,
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
