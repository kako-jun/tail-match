#!/usr/bin/env node

/**
 * 埼玉県動物指導センター YAML抽出スクリプト
 *
 * 特徴:
 * - 収容猫情報ページから猫情報を抽出
 * - YAML形式で出力
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'saitama/saitama-pref',
  municipalityId: 15, // 埼玉県動物指導センター
  base_url: 'https://www.pref.saitama.lg.jp',
  source_url: 'https://www.pref.saitama.lg.jp/b0716/shuuyou-jyouhou-pocg.html',
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

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 埼玉県動物指導センター - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: 最新HTMLファイルを読み込み
    const htmlFile = getLatestHtmlFile();
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    // Step 2: 猫がいるか確認
    const noDataText = $('h2:contains("新着情報")').next('p').text();
    console.log(`📊 状況チェック: ${noDataText}`);

    if (
      noDataText.includes('新着情報はありません') ||
      noDataText.includes('収容されている猫はいません')
    ) {
      console.log('⚠️ 現在収容されている猫はいません');

      // 空のYAMLを出力
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
            total_count: 0,
            note: '収容猫なし',
          },
          animals: [],
        },
        { indent: 2, lineWidth: -1 }
      );

      fs.writeFileSync(outputFile, yamlContent, 'utf-8');

      console.log(`\n✅ YAML出力完了: ${outputFile}`);
      console.log(`📊 猫数: 0匹`);
      console.log('\n' + '='.repeat(60));
      console.log('✅ YAML抽出完了（猫なし）');
      console.log('='.repeat(60));
      return;
    }

    // Step 3: テーブルから猫情報を抽出
    const allCats = [];
    const $tables = $('table[border="1"]');

    console.log(`📊 検出したテーブル数: ${$tables.length}`);

    $tables.each((tableIndex, table) => {
      const $table = $(table);
      const $rows = $table.find('tr');

      // 管理番号の取得
      let managementNumber = null;
      let collectionDate = null;
      let location = null;
      let features = null;

      $rows.each((rowIndex, row) => {
        const $row = $(row);
        const $cells = $row.find('td');

        if ($cells.length >= 2) {
          const label = $cells.eq(0).text().trim();
          const value = $cells.eq(1).text().trim();

          if (label.includes('管理番号')) {
            managementNumber = value;
          } else if (label.includes('収容日')) {
            collectionDate = value;
          } else if (label.includes('収容場所') || label.includes('市')) {
            location = value;
          } else if (label.includes('特徴') || label.includes('毛色')) {
            features = value;
          }
        }
      });

      // 管理番号が有効な場合のみ追加
      if (managementNumber && managementNumber !== '2025-' && managementNumber.length > 5) {
        const cat = {
          external_id: managementNumber,
          name: null,
          animal_type: 'cat',
          breed: null,
          age_estimate: null,
          gender: 'unknown',
          color: features || null,
          size: null,
          health_status: null,
          personality: null,
          special_needs: null,
          images: [],
          protection_date: collectionDate || null,
          deadline_date: null,
          source_url: CONFIG.source_url,
          confidence_level: 'medium',
          extraction_notes: ['収容動物情報（迷子猫）', `収容場所: ${location || '不明'}`],
          listing_type: 'lost_pet',
        };

        allCats.push(cat);
        console.log(`\n--- 猫 ${allCats.length} ---`);
        console.log(`   管理番号: ${cat.external_id}`);
        console.log(`   収容日: ${cat.protection_date || '不明'}`);
      }
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // Step 4: YAML出力
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
          note: '収容動物情報（迷子猫、飼い主探し用）',
        },
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
