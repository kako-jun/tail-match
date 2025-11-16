#!/usr/bin/env node

/**
 * 浜松市動物愛護教育センター（猫） PDF→YAML変換スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';
import { execSync } from 'child_process';

const CONFIG = {
  municipality: 'shizuoka/hamamatsu-city-cats',
  source_url: 'https://www.hama-aikyou.jp/jouto/cat/',
};

function getLatestPdfDir() {
  const pdfDir = path.join(
    process.cwd(),
    'data',
    'pdf',
    CONFIG.municipality.replace('/', path.sep)
  );
  return pdfDir;
}

function extractCatInfo(text, pdfName) {
  // PDFテキストから猫情報を抽出
  // 複数の猫が1つのPDFに含まれる場合がある

  const cats = [];

  // テキストを「推定年齢」または「年齢」で分割（各猫のセクションの先頭）
  let sections = text.split(/\n\s*推定年齢/);

  // ワケアリ猫フォーマットの場合は「年齢」で分割
  if (sections.length === 1) {
    sections = text.split(/\n\s*年齢/);
  }

  const isWakeariFormat = !text.includes('推定年齢');

  // 最初のセクション（ヘッダー）をスキップ
  for (let i = 1; i < sections.length; i++) {
    const section = (isWakeariFormat ? '年齢' : '推定年齢') + sections[i]; // セクションヘッダーを復元

    // 推定年齢（通常のフォーマット or ワケアリ猫フォーマット）
    let ageMatch = section.match(/推定年齢\s+(推定)?([０-９0-9]+)歳/);
    if (!ageMatch) {
      // ワケアリ猫フォーマット: 年齢         推定３歳
      ageMatch = section.match(/年齢\s+(推定)?([０-９0-9]+)歳/);
    }
    let age_estimate = null;
    if (ageMatch) {
      const age = ageMatch[2].replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      );
      age_estimate = `推定${age}歳`;
    }

    // 仮名（名前）
    const nameMatch = section.match(/仮名\s+(.+?)(?:\s|　)(?:色柄|性別|\n)/);
    let name = nameMatch ? nameMatch[1].trim() : null;

    // マッチしない場合は従来の方法
    if (!name) {
      const simpleMatch = section.match(/仮名\s+(.+?)\n/);
      name = simpleMatch ? simpleMatch[1].trim() : null;
    }

    if (!name) continue; // 名前がない場合はスキップ

    // 性別
    const genderMatch = section.match(/性別\s+(メス|オス)/);
    let gender = 'unknown';
    if (genderMatch) {
      gender = genderMatch[1] === 'メス' ? 'female' : 'male';
    }

    // 未避妊/未去勢チェック
    let health_status_parts = [];
    if (section.includes('未避妊')) {
      health_status_parts.push('未避妊');
    } else if (section.includes('避妊済')) {
      health_status_parts.push('避妊手術済');
    }
    if (section.includes('未去勢')) {
      health_status_parts.push('未去勢');
    } else if (section.includes('去勢済')) {
      health_status_parts.push('去勢手術済');
    }

    // 色柄
    const colorMatch = section.match(/色柄\s+(.+?)\n/);
    const color = colorMatch ? colorMatch[1].trim() : null;

    // 性格
    const personalityMatch = section.match(/性格\s+(.+?)(?=\n|アピール)/s);
    const personality = personalityMatch ? personalityMatch[1].trim().replace(/\s+/g, '') : null;

    // アピールポイント
    const appealMatch = section.match(/アピールポイント\s+(.+?)(?=\n推定年齢|\n成猫|$)/s);
    const special_needs = appealMatch ? appealMatch[1].trim().replace(/\s+/g, '') : null;

    const external_id = `hamamatsu-city-${name.toLowerCase().replace(/\s+/g, '-')}`;

    cats.push({
      external_id,
      name,
      animal_type: 'cat',
      breed: null,
      age_estimate,
      gender,
      color,
      size: null,
      health_status: health_status_parts.join('、') || null,
      personality,
      special_needs,
      images: [],
      protection_date: null,
      deadline_date: null,
      status: 'available',
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [`PDF: ${pdfName}`],
      listing_type: 'adoption',
    });
  }

  return cats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 浜松市動物愛護教育センター（猫） - PDF→YAML変換');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  const previousCounts = logger.loadPreviousCounts() || {
    htmlCount: null,
    yamlCount: null,
    dbCount: null,
  };

  const pdfDir = getLatestPdfDir();
  console.log(`📁 PDFディレクトリ: ${pdfDir}\n`);

  // PDFファイルを取得（メタデータを除く）
  const pdfFiles = fs
    .readdirSync(pdfDir)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  console.log(`📄 PDF数: ${pdfFiles.length}件\n`);

  const allCats = [];

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(pdfDir, pdfFile);
    console.log(`📖 解析中: ${pdfFile}`);

    try {
      // pdftotextコマンドでPDFのテキストを抽出
      const text = execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf-8' });

      const cats = extractCatInfo(text, pdfFile);
      console.log(`  ✅ 抽出: ${cats.length}匹`);

      cats.forEach((cat) => {
        console.log(`     - ${cat.name} (${cat.gender}, ${cat.age_estimate || '年齢不明'})`);
        allCats.push(cat);
      });
    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`);
    }

    console.log();
  }

  console.log(`📊 合計抽出: ${allCats.length}匹\n`);

  // 前回との比較
  if (previousCounts.htmlCount !== null) {
    const diff = allCats.length - previousCounts.htmlCount;
    if (diff < 0) {
      console.warn(
        `⚠️  警告: 前回PDF (${previousCounts.htmlCount}匹) より ${Math.abs(diff)}匹減少しています`
      );
    }
  }

  logger.logYAMLCount(allCats.length);

  // YAML出力
  const yamlDir = path.join(
    process.cwd(),
    'data',
    'yaml',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(yamlDir, { recursive: true });

  const timestamp = getJSTTimestamp();
  const yamlPath = path.join(yamlDir, `${timestamp}_animals.yaml`);

  const yamlData = {
    metadata: {
      municipality: CONFIG.municipality,
      source_url: CONFIG.source_url,
      scraped_at: getJSTISOString(),
      total_count: allCats.length,
    },
    animals: allCats,
  };

  fs.writeFileSync(yamlPath, yaml.dump(yamlData, { lineWidth: -1, noRefs: true }), 'utf-8');

  console.log(`💾 YAML保存: ${yamlPath}`);
  console.log('\n' + '='.repeat(60));
  console.log('✅ PDF→YAML変換完了');
  console.log('='.repeat(60));

  logger.finalize();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
