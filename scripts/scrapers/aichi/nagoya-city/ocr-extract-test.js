#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像OCR抽出スクリプト（テスト版：5枚のみ）
 */

import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  municipality: 'aichi/nagoya-city',
  testLimit: 5, // テスト用：5枚のみ
};

async function extractTextFromImage(worker, imagePath) {
  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);
    return text || null;
  } catch (error) {
    console.error(`OCRエラー: ${error.message}`);
    return null;
  }
}

function parseExtractedText(text, externalId) {
  try {
    // お問い合わせ番号（右上の大きな数字）
    const inquiryMatch = text.match(/(\d{4})/);
    const inquiry_number = inquiryMatch ? inquiryMatch[1] : null;

    // 種類・品種（「犬種」「猫種」「種類」すべてに対応、改行前まで抽出）
    const breedMatch = text.match(/(?:犬|猫)?\s*種\s*(?:類)?[:：\s]*([^\n]+)/);
    let breed = breedMatch ? breedMatch[1].trim() : null;
    if (breed) {
      breed = breed
        .replace(/\s+/g, '')
        .replace(/[』】\]]/g, '')
        .split(/[。、]/)[0];
    }

    // 毛色（改行前まで抽出、スペース除去）
    const colorMatch = text.match(/毛\s*色[:：\s]*([^\n]+)/);
    let color = colorMatch ? colorMatch[1].trim() : null;
    if (color) {
      color = color.replace(/\s+/g, '').split(/[。、]/)[0];
    }

    // 性別
    const genderMatch = text.match(/性\s*別[:：\s]*(オス|メス|雄|雌)/);
    let gender = 'unknown';
    if (genderMatch) {
      const g = genderMatch[1];
      gender = g === 'オス' || g === '雄' ? 'male' : 'female';
    }

    // 年齢（OCRミス対応：「年齢」「年人齢」「年_齢」など、同一行内で「齢」を含むパターン）
    const ageMatch = text.match(/年[^\n齢]*齢\s*[:：\s]*([^\n]+)/);
    let age_estimate = null;
    if (ageMatch) {
      const ageOnlyMatch = ageMatch[1].match(/(\d+\s*(?:歳|才|ヶ月|ヵ月|か月))/);
      age_estimate = ageOnlyMatch ? ageOnlyMatch[1].replace(/\s+/g, '') : null;
    }

    // 健康状態
    const healthParts = [];
    if (text.includes('避妊去勢') || text.includes('去勢')) {
      healthParts.push(text.match(/避妊去勢[:：\s]*(済|未実施|無)/)?.[0] || '避妊去勢済');
    }
    if (text.includes('マイクロチップ')) {
      healthParts.push(text.match(/マイクロチップ[:：\s]*(有|無)/)?.[0] || 'マイクロチップ無');
    }
    if (text.includes('猫エイズ検査')) {
      healthParts.push(
        text.match(/猫エイズ検査[:：\s]*(陰性|陽性|未検査)/)?.[0] || '猫エイズ検査陰性'
      );
    }
    if (text.includes('猫白血病検査') || text.includes('猫白血病ウイルス')) {
      healthParts.push(
        text.match(/猫白血病[^：]*[:：\s]*(陰性|陽性|未検査)/)?.[0] || '猫白血病検査陰性'
      );
    }
    if (text.includes('ワクチン')) {
      const vaccineMatch = text.match(/ワクチン[:：\s]*([^\n]+)/);
      healthParts.push(vaccineMatch ? vaccineMatch[0].trim() : 'ワクチン接種済');
    }

    const health_status = healthParts.length > 0 ? healthParts.join('、') : null;

    // 性格
    const personalityMatch = text.match(/性\s*格[:：\s]*([^\n]+)/);
    const personality = personalityMatch ? personalityMatch[1].trim() : null;

    // 募集の経緯
    const needsMatch = text.match(/募集の経緯[:：\s]*([^\n]+)/);
    const special_needs = needsMatch ? needsMatch[1].trim() : null;

    // 動物種判定（猫エイズ検査があれば猫、なければ犬と推定）
    const animal_type = text.includes('猫エイズ') || text.includes('猫白血病') ? 'cat' : 'dog';

    return {
      inquiry_number,
      animal_type,
      breed,
      color,
      gender,
      age_estimate,
      health_status,
      personality,
      special_needs,
    };
  } catch (error) {
    console.error(`❌ パースエラー: ${externalId}`, error.message);
    return null;
  }
}

async function extractFromImage(worker, imagePath, externalId) {
  try {
    console.log(`\n📸 処理中: ${externalId}`);

    const text = await extractTextFromImage(worker, imagePath);

    if (!text) {
      console.error(`❌ OCR失敗: ${externalId}`);
      return null;
    }

    const extractedData = parseExtractedText(text, externalId);

    if (!extractedData) {
      console.error(`❌ パース失敗: ${externalId}`);
      return null;
    }

    console.log(
      `✅ 抽出完了: ${extractedData.animal_type} (${extractedData.gender}, ${extractedData.age_estimate})`
    );

    return extractedData;
  } catch (error) {
    console.error(`❌ エラー: ${externalId}`, error.message);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 テスト: 名古屋市動物愛護センター - 画像OCR抽出（5枚）');
  console.log('='.repeat(60) + '\n');

  console.log('⚙️  Tesseract.js 初期化中...');
  const worker = await createWorker('jpn+eng', 1);

  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });

  console.log('✅ Tesseract.js 初期化完了\n');

  const imagesDir = path.join(
    process.cwd(),
    'data',
    'images',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ 画像ディレクトリが見つかりません: ${imagesDir}`);
    await worker.terminate();
    process.exit(1);
  }

  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .slice(0, CONFIG.testLimit); // 最初の5枚のみ

  console.log(`📊 テスト画像数: ${imageFiles.length}\n`);

  const extractedData = {};
  let processedCount = 0;
  let errorCount = 0;

  for (const imageFile of imageFiles) {
    const imagePath = path.join(imagesDir, imageFile);
    const externalId = imageFile.replace('nagoya-', '').replace('.jpg', '');

    const data = await extractFromImage(worker, imagePath, externalId);

    if (data) {
      extractedData[externalId] = data;
      processedCount++;
    } else {
      errorCount++;
    }
  }

  await worker.terminate();

  console.log('\n' + '='.repeat(60));
  console.log('✅ テスト完了');
  console.log('='.repeat(60));
  console.log(`📊 処理数: ${processedCount}/${imageFiles.length}`);
  console.log(`❌ エラー: ${errorCount}`);
  console.log('\n抽出データサンプル:');
  console.log(JSON.stringify(extractedData, null, 2));
}

main().catch(console.error);
