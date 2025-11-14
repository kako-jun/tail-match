#!/usr/bin/env node

/**
 * 愛知県動物愛護センター（全支所統合）猫 YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'aichi/aichi-pref-cats',
  base_url: 'https://www.pref.aichi.jp',
  branches: [
    { name: 'honjo', url: 'https://www.pref.aichi.jp/soshiki/doukan-c/honsyoneko.html' },
    { name: 'owari', url: 'https://www.pref.aichi.jp/soshiki/doukan-c/owarineko.html' },
    { name: 'chita', url: 'https://www.pref.aichi.jp/soshiki/doukan-c/titaneko.html' },
  ],
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
 * テーブル行から猫情報を抽出
 */
function extractCatFromTableRow($, $row, branchName) {
  const cells = $row.find('td');
  if (cells.length < 2) return null;

  // 1列目: 画像
  const $imgCell = $(cells[0]);
  const $img = $imgCell.find('img');
  const images = [];
  if ($img.length > 0) {
    const src = $img.attr('src');
    if (src) {
      images.push(src.startsWith('http') ? src : CONFIG.base_url + src);
    }
  }

  // 2列目: 特徴（テキスト情報）
  const $detailCell = $(cells[1]);
  let detailText = $detailCell.text().trim();
  const detailHtml = $detailCell.html() || '';

  // 全角数字を半角に変換（愛知県は全角数字を使用）
  detailText = detailText.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

  // 管理No.を抽出
  const managementMatch = detailText.match(/管理No\.?\s*(\d+)/i);
  if (!managementMatch) return null;

  const managementNo = managementMatch[1];
  const external_id = `aichi-${branchName}-${managementNo}`;

  // 性別を抽出
  let gender = 'unknown';
  if (detailText.includes('オス') || detailText.includes('雄')) {
    gender = 'male';
  } else if (detailText.includes('メス') || detailText.includes('雌')) {
    gender = 'female';
  }

  // 年齢を抽出
  const ageMatch = detailText.match(/推定?(\d+)[歳才]/);
  const age_estimate = ageMatch ? `${ageMatch[1]}歳` : null;

  // 毛色・品種を抽出
  const breedMatch = detailText.match(/(雑種|キジトラ|サビ|三毛|白|黒|茶トラ|グレー)/);
  const color = breedMatch ? breedMatch[1] : null;

  // 譲渡済み判定
  const status = getAdoptionStatus(detailText + ' ' + detailHtml);

  return {
    external_id,
    name: null, // 名前なし（yaml-to-db.jsでデフォルト名生成）
    animal_type: 'cat',
    breed: null,
    age_estimate,
    gender,
    color,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images,
    protection_date: null,
    deadline_date: null,
    status,
    source_url: CONFIG.branches.find((b) => b.name === branchName)?.url || '',
    confidence_level: 'high',
    extraction_notes: [`${branchName}支所`, `管理No.${managementNo}`],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 愛知県動物愛護センター（全支所）- YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');

    // 各支所のセクションを分割
    const branches = html.split(/<!-- BRANCH: (\w+) -->/);
    const allCats = [];

    for (let i = 1; i < branches.length; i += 2) {
      const branchName = branches[i];
      const branchHtml = branches[i + 1];

      console.log(`\n📋 ${branchName}支所を処理中...`);

      const $ = load(branchHtml);

      // テーブルから猫情報を抽出
      $('table tr').each((index, row) => {
        const $row = $(row);

        // ヘッダー行をスキップ
        if ($row.find('th').length > 0) return;

        const cat = extractCatFromTableRow($, $row, branchName);
        if (cat) {
          allCats.push(cat);
          console.log(`   猫 ${allCats.length}: ${cat.external_id}`);
          console.log(`      性別: ${cat.gender}, 年齢: ${cat.age_estimate || '不明'}`);
          console.log(`      毛色: ${cat.color || '不明'}, 状態: ${cat.status}`);
        }
      });
    }

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);
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
          source_urls: CONFIG.branches.map((b) => b.url),
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          total_count: allCats.length,
          note: '愛知県全支所統合・譲渡候補猫情報',
        },
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    logger.finalize();

    console.log('='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize();
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
