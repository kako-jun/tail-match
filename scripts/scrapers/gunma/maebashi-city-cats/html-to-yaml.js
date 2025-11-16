#!/usr/bin/env node

/**
 * 前橋市保健所（猫） YAML抽出スクリプト
 *
 * 特徴:
 * - テーブル形式（管理番号 C2025-XXX）
 * - 各猫が独立したテーブル要素
 * - caption: 管理番号 or "譲渡決定"
 * - 5行構成: [名前,品種,ワクチン] [毛色,性別] [年齢,性格] [説明] [画像]
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
  municipality: 'gunma/maebashi-city-cats',
  base_url: 'https://www.city.maebashi.gunma.jp',
  source_url: 'https://www.city.maebashi.gunma.jp/soshiki/kenko/eiseikensa/gyomu/1/1/3/17223.html',
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
 * @param {string} genderText - 例: "メス(未避妊)", "オス(未去勢)", "メス", "オス"
 */
function parseGender(genderText) {
  const trimmed = genderText.trim();

  if (trimmed.includes('メス')) {
    return {
      gender: 'female',
      neutered: trimmed.includes('未避妊') ? '未避妊' : null,
    };
  } else if (trimmed.includes('オス')) {
    return {
      gender: 'male',
      neutered: trimmed.includes('未去勢') ? '未去勢' : null,
    };
  }

  return {
    gender: 'unknown',
    neutered: null,
  };
}

/**
 * 猫情報を抽出
 */
function extractCats($) {
  const cats = [];

  // 各テーブルを処理（captionを持つテーブル）
  $('table[border="1"]').each((i, table) => {
    const $table = $(table);
    const caption = $table.find('caption').text().trim();

    if (!caption) {
      return;
    }

    // 管理番号パターンがないテーブルはスキップ（登録団体一覧など）
    if (!caption.match(/C2025-\d+/) && !caption.includes('譲渡')) {
      return;
    }

    // 譲渡済み判定
    const status = getAdoptionStatus(caption);

    // 管理番号を取得（譲渡済みの場合は管理番号なし）
    const managementNumber = caption.match(/C2025-\d+/) ? caption : null;

    // テーブル行を取得
    const rows = $table.find('tbody tr');

    if (rows.length < 5) {
      console.log(`  ⚠️  テーブル行数不足: ${caption}`);
      return;
    }

    // Row 0: [名前, 品種, ワクチン履歴(rowspan 3)]
    const row0 = $(rows[0]);
    const name = row0.find('td').eq(0).text().trim();
    const breed = row0.find('td').eq(1).text().trim();
    const vaccine = row0.find('td').eq(2).text().trim().replace(/\s+/g, ' ');

    // Row 1: [毛色, 性別]
    const row1 = $(rows[1]);
    const color = row1.find('td').eq(0).text().trim();
    const genderText = row1.find('td').eq(1).text().trim();
    const genderInfo = parseGender(genderText);

    // Row 2: [年齢, 性格]
    const row2 = $(rows[2]);
    const age = row2.find('td').eq(0).text().trim();
    const personality = row2.find('td').eq(1).text().trim();

    // Row 3: [説明 (colspan 3)]
    const row3 = $(rows[3]);
    const description = row3.find('td').text().trim();

    // Row 4: [画像 (colspan 3)]
    const row4 = $(rows[4]);
    const images = [];
    row4.find('img').each((j, img) => {
      const src = $(img).attr('src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
        images.push(fullUrl);
      }
    });

    // YAML出力用オブジェクト作成
    const notes = [];
    if (vaccine) notes.push(`ワクチン履歴: ${vaccine}`);
    if (genderInfo.neutered) notes.push(`去勢・避妊: ${genderInfo.neutered}`);

    cats.push({
      external_id: managementNumber,
      name: name,
      animal_type: 'cat',
      breed: breed || '雑種',
      age_estimate: age,
      gender: genderInfo.gender,
      color: color,
      size: null,
      health_status: vaccine || null,
      personality: personality,
      special_needs:
        description.includes('失明') || description.includes('障害') ? description : null,
      images: images,
      protection_date: null,
      deadline_date: null,
      status: status,
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: notes,
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
    console.log('🐱 前橋市保健所（猫） - YAML抽出');
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
        const statusMark = cat.status === 'adopted' ? '【譲渡済】' : '';
        console.log(
          `   ${index + 1}. ${cat.name} ${statusMark}(${cat.external_id || '管理番号なし'}) - ${cat.breed}, ${cat.gender === 'male' ? 'オス' : cat.gender === 'female' ? 'メス' : '不明'}, ${cat.age_estimate}`
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
