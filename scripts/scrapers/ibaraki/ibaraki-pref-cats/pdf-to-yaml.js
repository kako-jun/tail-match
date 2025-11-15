#!/usr/bin/env node

/**
 * 茨城県動物指導センター PDF→YAML変換スクリプト（猫）
 *
 * PDFから猫の情報を抽出してYAMLファイルに変換します。
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createLogger } from '../../../lib/history-logger.js';
import { getJSTTimestamp } from '../../../lib/timestamp.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ibaraki/ibaraki-pref-cats',
  baseUrl: 'https://www.pref.ibaraki.jp',
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐱 茨城県動物指導センター - PDF→YAML変換（猫）');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}\n`);

  try {
    // 最新のPDFファイルを取得
    const htmlDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    const files = fs
      .readdirSync(htmlDir)
      .filter((f) => f.endsWith('.pdf'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('PDFファイルが見つかりません。先にscrape.jsを実行してください。');
    }

    const pdfPath = path.join(htmlDir, files[0]);
    console.log(`📄 PDF読み込み: ${pdfPath}`);

    // PDFからテキストを抽出
    const pdfText = await extractPDFText(pdfPath);
    console.log(`✅ テキスト抽出完了: ${pdfText.length}文字\n`);

    // 猫情報をパース
    const cats = parseCats(pdfText);
    console.log(`🔍 検出: ${cats.length}匹の猫\n`);

    logger.logYAMLCount(cats.length);

    // YAML生成
    const yamlData = {
      source: {
        municipality: CONFIG.municipality,
        url: `${CONFIG.baseUrl}/hokenfukushi/doshise/hogo/syuuyou.html`,
        scraped_at: new Date().toISOString(),
        note: 'PDFから抽出、茨城県動物指導センター',
      },
      cats: cats,
    };

    // 保存先ディレクトリ作成
    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    // YAML保存
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_cats.yaml`;
    const filepath = path.join(outputDir, filename);

    const yamlContent = yaml.dump(yamlData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    fs.writeFileSync(filepath, yamlContent, 'utf-8');
    console.log(`💾 YAML保存完了: ${filepath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF→YAML変換完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    logger.finalize();
  }
}

/**
 * PDFからテキストを抽出（2列レイアウト対応：列ごとに独立処理）
 */
async function extractPDFText(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) });
  const pdf = await loadingTask.promise;

  let leftText = '';
  let rightText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // x座標の境界を決定（500を基準）
    const COLUMN_BOUNDARY = 500;

    // 左列と右列のアイテムを分離
    const leftLines = {};
    const rightLines = {};

    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];

      if (x < COLUMN_BOUNDARY) {
        if (!leftLines[y]) leftLines[y] = [];
        leftLines[y].push({
          text: item.str,
          x: x,
        });
      } else {
        if (!rightLines[y]) rightLines[y] = [];
        rightLines[y].push({
          text: item.str,
          x: x,
        });
      }
    }

    // 左列を処理
    const sortedLeftYs = Object.keys(leftLines)
      .map(Number)
      .sort((a, b) => b - a);
    for (const y of sortedLeftYs) {
      const lineItems = leftLines[y];
      lineItems.sort((a, b) => a.x - b.x);
      const lineText = lineItems.map((item) => item.text).join(' ');
      if (lineText.trim()) leftText += lineText.trim() + '\n';
    }

    // 右列を処理
    const sortedRightYs = Object.keys(rightLines)
      .map(Number)
      .sort((a, b) => b - a);
    for (const y of sortedRightYs) {
      const lineItems = rightLines[y];
      lineItems.sort((a, b) => a.x - b.x);
      const lineText = lineItems.map((item) => item.text).join(' ');
      if (lineText.trim()) rightText += lineText.trim() + '\n';
    }
  }

  // 左列と右列を結合
  return leftText + '\n\n' + rightText;
}

/**
 * 猫情報をパース（改善版：全管理番号を先に収集）
 */
function parseCats(text) {
  const cats = [];
  const lines = text.split('\n').filter((line) => line.trim());

  // まず、すべての管理番号とそのインデックスを収集
  const animalIndices = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const idMatch = line.match(/^(\d{2}-\d{4})\s+市町村名\s+(.+)/);
    if (idMatch) {
      animalIndices.push({
        index: i,
        id: idMatch[1],
        location: idMatch[2] || '不明',
      });
    }
  }

  // 各管理番号に対して、次の管理番号までの情報を収集
  for (let idx = 0; idx < animalIndices.length; idx++) {
    const current = animalIndices[idx];
    const nextIndex = idx + 1 < animalIndices.length ? animalIndices[idx + 1].index : lines.length;

    const id = current.id;
    const location = current.location;

    let receivedDate = '';
    let name = '名前なし';
    let animalType = '';
    let breed = '雑種';
    let color = '不明';
    let genderText = '不明';
    let size = '不明';
    let collar = '不明';

    // current.index + 1 から nextIndex までの行を調べる
    for (let j = current.index + 1; j < nextIndex; j++) {
      const line = lines[j].trim();

      // 収容日と名前
      const dateNameMatch = line.match(/^収容日\s+([0-9/]+)\s+(.+)/);
      if (dateNameMatch) {
        receivedDate = dateNameMatch[1];
        name = dateNameMatch[2];
        continue;
      }

      // 種類と品種
      const typeBreedMatch = line.match(/^種類\s+(\S+)\s+犬猫種\s+(.+)/);
      if (typeBreedMatch) {
        animalType = typeBreedMatch[1];
        breed = typeBreedMatch[2];
        continue;
      }

      // 毛色と性別
      const colorGenderMatch = line.match(/^毛色\s+(\S+)\s+性別\s+(.+)/);
      if (colorGenderMatch) {
        color = colorGenderMatch[1];
        genderText = colorGenderMatch[2];
        continue;
      }

      // 体格と首輪
      const sizeCollarMatch = line.match(/^体格\s+(\S+)\s+首輪\s+(.+)/);
      if (sizeCollarMatch) {
        size = sizeCollarMatch[1];
        collar = sizeCollarMatch[2];
        continue;
      }
    }

    // 猫のみ抽出
    if (animalType !== '猫') {
      continue;
    }

    // 性別をパース
    let gender = 'unknown';
    if (genderText.includes('メス') || genderText.includes('雌')) {
      gender = 'female';
    } else if (genderText.includes('オス') || genderText.includes('雄')) {
      gender = 'male';
    }

    const cat = {
      external_id: `ibaraki-pref-cat-${id}`,
      name: name,
      gender: gender,
      age: 'adult',
      breed: breed,
      color: color,
      features: `体格: ${size}, 首輪: ${collar}`,
      location: location,
      received_date: receivedDate,
      status: 'available',
      image_url: null,
      notes: `管理番号: ${id}`,
    };

    cats.push(cat);
  }

  return cats;
}

// ========================================
// 実行
// ========================================

main();
