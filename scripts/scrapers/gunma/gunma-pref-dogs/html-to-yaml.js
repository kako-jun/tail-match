#!/usr/bin/env node

/**
 * 群馬県動物愛護センター（犬） YAML抽出スクリプト
 *
 * 特徴:
 * - 譲渡犬一覧ページから犬情報を抽出
 * - h4見出しとテキストから詳細情報を取得
 * - YAML形式で出力
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
  municipality: 'gunma/gunma-pref-dogs',
  base_url: 'https://www.pref.gunma.jp',
  source_url: 'https://www.pref.gunma.jp/page/5761.html',
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
 * 詳細情報をパース
 * 例: "雑種、8才齢（推定）、オス、白茶、中型（18.1キログラム）、パワフル、去勢済み"
 */
function parseDetails(detailText) {
  const parts = detailText.split('、');
  const result = {
    breed: null,
    age: null,
    gender: 'unknown',
    color: null,
    size: null,
    weight: null,
    personality: null,
    neutered: null,
  };

  parts.forEach((part) => {
    const trimmed = part.trim();

    // 品種（最初の要素）
    if (
      !result.breed &&
      !trimmed.includes('齢') &&
      !trimmed.includes('オス') &&
      !trimmed.includes('メス')
    ) {
      result.breed = trimmed;
      return;
    }

    // 年齢
    if (trimmed.includes('齢')) {
      result.age = trimmed;
      return;
    }

    // 性別
    if (trimmed === 'オス') {
      result.gender = 'male';
      return;
    }
    if (trimmed === 'メス') {
      result.gender = 'female';
      return;
    }

    // 毛色
    if (
      !result.color &&
      !trimmed.includes('型') &&
      !trimmed.includes('キログラム') &&
      !trimmed.includes('去勢') &&
      !trimmed.includes('避妊')
    ) {
      result.color = trimmed;
      return;
    }

    // サイズと体重
    if (trimmed.includes('キログラム')) {
      const weightMatch = trimmed.match(/([\d.]+)キログラム/);
      if (weightMatch) {
        result.weight = parseFloat(weightMatch[1]);
      }
      // サイズ（小型・中型・大型）
      if (trimmed.includes('小型')) result.size = 'small';
      else if (trimmed.includes('中型')) result.size = 'medium';
      else if (trimmed.includes('大型')) result.size = 'large';
      return;
    }

    // 去勢・避妊
    if (trimmed.includes('去勢') || trimmed.includes('避妊')) {
      result.neutered = trimmed;
      return;
    }

    // 性格
    if (!result.personality) {
      result.personality = trimmed;
    }
  });

  return result;
}

/**
 * 犬情報を抽出
 */
function extractDogs($) {
  const dogs = [];

  // h4見出しでニックネームを探す
  $('h4').each((i, elem) => {
    const $h4 = $(elem);
    const text = $h4.text().trim();

    // ニックネーム：で始まる見出しのみ処理
    if (!text.startsWith('ニックネーム：')) {
      return;
    }

    // リンクからニックネームを取得
    const $link = $h4.find('a');
    if ($link.length === 0) {
      return;
    }

    const nickname = $link.text().trim();
    const detailUrl = $link.attr('href');
    const fullDetailUrl = detailUrl.startsWith('http') ? detailUrl : CONFIG.base_url + detailUrl;

    // 管理番号を抽出（（管理番号2024-027））
    const idMatch = text.match(/管理番号([^\）]+)/);
    const managementNumber = idMatch ? idMatch[1].trim() : null;

    if (!managementNumber) {
      console.log(`  ⚠️  管理番号が見つかりません: ${text}`);
      return;
    }

    // 次のp要素から画像と詳細情報を取得
    let $nextP = $h4.next('p');
    const images = [];
    let details = null;

    while ($nextP.length > 0) {
      const pText = $nextP.text().trim();

      // 画像を取得
      const $imgs = $nextP.find('img');
      if ($imgs.length > 0) {
        $imgs.each((j, img) => {
          const src = $(img).attr('src');
          if (src) {
            const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
            images.push(fullUrl);
          }
        });
      }

      // 詳細情報を取得（品種、年齢、性別などが含まれる）
      if (pText && pText.includes('、') && (pText.includes('オス') || pText.includes('メス'))) {
        details = parseDetails(pText);
      }

      // 次のh4が来たら終了
      $nextP = $nextP.next();
      if ($nextP.is('h4') || $nextP.is('hr')) {
        break;
      }
    }

    // 譲渡済み判定
    const status = getAdoptionStatus(text);

    dogs.push({
      external_id: managementNumber,
      name: nickname,
      animal_type: 'dog',
      breed: details ? details.breed : null,
      age_estimate: details ? details.age : null,
      gender: details ? details.gender : 'unknown',
      color: details ? details.color : null,
      size: details ? details.size : null,
      health_status: details && details.neutered ? details.neutered : null,
      personality: details ? details.personality : null,
      special_needs: null,
      images: images,
      protection_date: null,
      deadline_date: null,
      status: status,
      source_url: fullDetailUrl,
      confidence_level: 'high', // 詳細情報がHTMLに記載されているためHIGH
      extraction_notes: [
        '品種・年齢・性別・毛色・体重などの詳細情報を抽出',
        details && details.weight ? `体重: ${details.weight}kg` : null,
      ].filter(Boolean),
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
    console.log('🐕 群馬県動物愛護センター（犬） - YAML抽出');
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
          `   ${index + 1}. ${dog.name} (${dog.external_id}) - ${dog.breed || '不明'}, ${dog.gender === 'male' ? 'オス' : dog.gender === 'female' ? 'メス' : '不明'}`
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
