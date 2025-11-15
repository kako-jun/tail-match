#!/usr/bin/env node

/**
 * 横浜市犬OCRテスト - 1枚だけ処理してOCRテキストを確認
 */

import { createWorker } from 'tesseract.js';
import path from 'path';

async function test() {
  const worker = await createWorker('jpn+eng', 1);
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });

  const imagePath = path.join(
    process.cwd(),
    'data/images/kanagawa/yokohama-city-dogs/193jotoC25022001.JPG'
  );

  console.log('🔍 OCR実行中...\n');
  const {
    data: { text },
  } = await worker.recognize(imagePath);

  console.log('📝 抽出されたテキスト:');
  console.log('='.repeat(60));
  console.log(text);
  console.log('='.repeat(60));

  await worker.terminate();
}

test().catch(console.error);
