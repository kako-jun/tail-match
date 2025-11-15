#!/usr/bin/env node

/**
 * 横浜市動物愛護センター OCRテスト（1枚のみ）
 */

import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';

const CONFIG = {
  municipality: 'kanagawa/yokohama-city-cats',
  testLimit: 1,
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

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 テスト: 横浜市動物愛護センター - 画像OCR抽出（1枚）');
  console.log('='.repeat(60) + '\n');

  console.log('⚙️  Tesseract.js 初期化中...');
  const worker = await createWorker('jpn+eng', 1);
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });
  console.log('✅ Tesseract.js 初期化完了\n');

  const imagesDir = path.join(process.cwd(), 'data', 'images', 'kanagawa', 'yokohama-city');

  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ 画像ディレクトリが見つかりません: ${imagesDir}`);
    await worker.terminate();
    process.exit(1);
  }

  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => f.endsWith('.jpg') || f.endsWith('.JPG'))
    .sort()
    .slice(0, CONFIG.testLimit);

  console.log(`📊 テスト画像数: ${imageFiles.length}\n`);

  for (const imageFile of imageFiles) {
    const imagePath = path.join(imagesDir, imageFile);
    console.log(`📸 処理中: ${imageFile}\n`);

    const text = await extractTextFromImage(worker, imagePath);

    if (!text) {
      console.error(`❌ OCR失敗`);
      continue;
    }

    console.log('='.repeat(80));
    console.log('📝 抽出されたテキスト:');
    console.log('='.repeat(80));
    console.log(text);
    console.log('='.repeat(80));
  }

  await worker.terminate();
  console.log('\n✅ テスト完了');
}

main().catch(console.error);
