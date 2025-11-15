#!/usr/bin/env node

/**
 * 香川県動物愛護管理センター PDF→YAML変換スクリプト（犬）
 *
 * PDFから犬の情報を抽出してYAMLファイルに変換します。
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
  municipality: 'kagawa/kagawa-pref-dogs',
  baseUrl: 'https://www.pref.kagawa.lg.jp',
};

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐕 香川県動物愛護管理センター - PDF→YAML変換（犬）');
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

    // 犬情報をパース
    const dogs = parseDogs(pdfText);
    console.log(`🔍 検出: ${dogs.length}匹の犬\n`);

    logger.logYAMLCount(dogs.length);

    // YAML生成
    const yamlData = {
      source: {
        municipality: CONFIG.municipality,
        url: `${CONFIG.baseUrl}/s-doubutuaigo/sanukidouaicenter/jyouto/s04u6e190311095146.html`,
        scraped_at: new Date().toISOString(),
        note: 'PDFから抽出、さぬき動物愛護センター「しっぽの森」（香川県・高松市共同運営）',
      },
      dogs: dogs,
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
    const filename = `${timestamp}_dogs.yaml`;
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
 * PDFからテキストを抽出（改行を考慮）
 */
async function extractPDFText(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY = null;
    let pageText = '';

    for (const item of textContent.items) {
      const currentY = item.transform[5]; // y座標

      // y座標が変わったら改行
      if (lastY !== null && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      }

      pageText += item.str + ' ';
      lastY = currentY;
    }

    fullText += pageText + '\n\n';
  }

  return fullText;
}

/**
 * PDFテキストから犬情報をパース
 */
function parseDogs(text) {
  const dogs = [];

  // テーブルヘッダーを除去
  text = text.replace(
    /センター\s+管理番号\s+推定\s+生年月日\s+品種\s+毛色\s+性別\s+狂犬病\s+混合\s+ワクチン\s+特徴/g,
    ''
  );
  text = text.replace(/～掲載されている犬について～.*?(?=\d[東中高西]-D\d+|$)/gs, '');

  // 1行ずつパース
  // フォーマット: 7東－D0001   R7.4.16   雑種   茶   オス  去勢済   済   済   ・人懐っこい...
  const lines = text.split(/\n+/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 管理番号で始まる行を検出
    const match = line.match(
      /^(\d[東中高西][-ー]D[OO0]?\d+)\s+(R\d+\.\d+\.\d+)\s+(雑種|[\w\s]+)\s+(.*?)$/
    );

    if (!match) continue;

    const [, managementNumber, birthDate, breed, rest] = match;

    // 残りの部分をパース: 毛色 性別 [去勢済] FeLV FIV 特徴
    // 例: キジトラ   オス  去勢済   陰性   ・もりもり食べて...
    const restParts = rest.split(/\s+/);

    let color = '';
    let gender = '';
    let neutered = null;
    let felvResult = '';
    let fivResult = '';
    let featuresStartIndex = 0;

    // 毛色（最初の要素）
    if (restParts.length > 0) {
      color = restParts[0];
      featuresStartIndex = 1;
    }

    // 性別（2番目の要素）
    if (restParts.length > 1) {
      gender = restParts[1];
      featuresStartIndex = 2;
    }

    // 去勢済み/避妊済み（オプション）
    if (
      restParts.length > 2 &&
      (restParts[2].includes('去勢済') || restParts[2].includes('避妊済'))
    ) {
      neutered = 'yes';
      featuresStartIndex = 3;
    }

    // FeLV検査結果
    if (restParts.length > featuresStartIndex) {
      felvResult = restParts[featuresStartIndex];
      featuresStartIndex++;

      // 「検査 未実施」の場合は2ワード
      if (felvResult === '検査' && restParts[featuresStartIndex] === '未実施') {
        felvResult = '検査 未実施';
        featuresStartIndex++;
      }
    }

    // FIV検査結果（オプション）
    if (restParts.length > featuresStartIndex && !restParts[featuresStartIndex].startsWith('・')) {
      fivResult = restParts[featuresStartIndex];
      featuresStartIndex++;

      // 「検査 未実施」の場合は2ワード
      if (fivResult === '検査' && restParts[featuresStartIndex] === '未実施') {
        fivResult = '検査 未実施';
        featuresStartIndex++;
      }
    }

    // 特徴（残りすべて）
    const features = restParts.slice(featuresStartIndex).join(' ');

    // 「譲渡希望者と交渉中です」が次の行にあるかチェック
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const isAdopted =
      nextLine.includes('譲渡希望者と交渉中です') || features.includes('譲渡希望者と交渉中です');

    // 生年月日を西暦に変換（令和 = 2018 + X年）
    const birthMatch = birthDate.match(/R(\d+)\.(\d+)\.(\d+)/);
    let birthDateWestern = '';
    if (birthMatch) {
      const year = 2018 + parseInt(birthMatch[1]);
      const month = birthMatch[2].padStart(2, '0');
      const day = birthMatch[3].padStart(2, '0');
      birthDateWestern = `${year}-${month}-${day}`;
    }

    const dog = {
      management_number: managementNumber.trim(),
      name: '', // PDFには名前がない
      gender: gender.trim(),
      age: '推定', // 生年月日から計算可能だが、ここでは「推定」とする
      breed: breed.trim(),
      color: color.trim(),
      birthdate: birthDateWestern,
      neutered: neutered ? 'yes' : 'unknown',
      rabies_vaccine: parseVaccine(felvResult), // 狂犬病ワクチン
      mixed_vaccine: parseVaccine(fivResult || felvResult), // 混合ワクチン
      features: features.trim().replace(/\s+/g, ' '),
      status: isAdopted ? 'adopted' : 'available',
      image_url: '', // PDFには画像URLがない
    };

    dogs.push(dog);
  }

  return dogs;
}

/**
 * ワクチン接種状況をパース
 */
function parseVaccine(result) {
  if (!result) return 'unknown';
  result = result.trim();
  if (result.includes('済')) return 'completed';
  if (result.includes('未')) return 'not_completed';
  return 'unknown';
}

// 実行
main();
