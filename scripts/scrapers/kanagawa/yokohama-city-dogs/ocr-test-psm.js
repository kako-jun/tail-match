#!/usr/bin/env node

/**
 * 横浜市犬OCRテスト - 異なるPSMモードで試す
 */

import { createWorker } from 'tesseract.js';
import path from 'path';

async function testWithPSM(psm, description) {
  const worker = await createWorker('jpn+eng', 1);
  await worker.setParameters({
    tessedit_pageseg_mode: psm.toString(),
  });

  const imagePath = path.join(
    process.cwd(),
    'data/images/kanagawa/yokohama-city-dogs/193jotoC25022001.JPG'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 PSM ${psm}: ${description}`);
  console.log('='.repeat(60));

  const {
    data: { text },
  } = await worker.recognize(imagePath);

  console.log(text.substring(0, 500));
  console.log('\n');

  // 重要な情報が抽出できているか確認
  const hasAge = text.match(/推\s*定\s*\d+\s*歳/) || text.match(/\d+\s*歳/);
  const hasGender = text.includes('メス') || text.includes('オス');
  const hasVaccine = text.includes('ワクチン') || text.includes('接種');
  const hasSurgery = text.includes('手術') || text.includes('不妊') || text.includes('去勢');

  console.log(`年齢: ${hasAge ? '✅' : '❌'} ${hasAge ? hasAge[0] : ''}`);
  console.log(`性別: ${hasGender ? '✅' : '❌'}`);
  console.log(`ワクチン: ${hasVaccine ? '✅' : '❌'}`);
  console.log(`手術: ${hasSurgery ? '✅' : '❌'}`);

  await worker.terminate();
}

async function main() {
  // PSM 3: Fully automatic page segmentation (default)
  await testWithPSM(3, '完全自動ページ分割');

  // PSM 6: Assume a single uniform block of text (current)
  await testWithPSM(6, '単一均一テキストブロック（現在の設定）');

  // PSM 11: Sparse text. Find as much text as possible in no particular order
  await testWithPSM(11, 'スパーステキスト（散在テキスト）');

  // PSM 12: Sparse text with OSD
  await testWithPSM(12, 'スパーステキスト（OSD付き）');
}

main().catch(console.error);
