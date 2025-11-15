#!/usr/bin/env node

/**
 * OCR精度テスト用スクリプト（1枚のみ処理）
 */

import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';

const imagePath = path.join(process.cwd(), 'data/images/aichi/nagoya-city/nagoya-250926-001.jpg');

async function testOCR() {
  console.log('🧪 OCR精度テスト開始\n');
  console.log(`📸 画像: ${imagePath}\n`);

  // Tesseract.js ワーカー初期化（日本語＋英語）
  console.log('⚙️  Tesseract.js 初期化中...');
  const worker = await createWorker('jpn+eng', 1);

  // PSM 6 = 単一の均一なテキストブロックと仮定（精度重視）
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });

  console.log('✅ Tesseract.js 初期化完了\n');

  // OCR実行
  console.log('🔍 OCR実行中...\n');
  const {
    data: { text },
  } = await worker.recognize(imagePath);

  await worker.terminate();

  console.log('='.repeat(80));
  console.log('📝 抽出されたテキスト（全文）:');
  console.log('='.repeat(80));
  console.log(text);
  console.log('='.repeat(80));

  // パース結果も表示
  console.log('\n📊 パース結果:');

  const inquiryMatch = text.match(/(\d{4})/);
  console.log(`お問い合わせ番号: ${inquiryMatch ? inquiryMatch[1] : 'なし'}`);

  const breedMatch = text.match(/(?:犬|猫)?\s*種\s*(?:類)?[:：\s]*([^\n]+)/);
  let breed = breedMatch ? breedMatch[1].trim() : null;
  if (breed) {
    breed = breed
      .replace(/\s+/g, '')
      .replace(/[』】\]]/g, '')
      .split(/[。、]/)[0];
  }
  console.log(`種類: ${breed || 'なし'}`);

  const colorMatch = text.match(/毛\s*色[:：\s]*([^\n]+)/);
  let color = colorMatch ? colorMatch[1].trim() : null;
  if (color) {
    color = color.replace(/\s+/g, '').split(/[。、]/)[0];
  }
  console.log(`毛色: ${color || 'なし'}`);

  const genderMatch = text.match(/性\s*別[:：\s]*(オス|メス|雄|雌)/);
  console.log(`性別: ${genderMatch ? genderMatch[1] : 'なし'}`);

  const ageMatch = text.match(/年[^\n齢]*齢\s*[:：\s]*([^\n]+)/);
  console.log(`年齢マッチ: ${ageMatch ? ageMatch[0] : 'なし'}`);
  console.log(`年齢マッチ[1]: ${ageMatch ? ageMatch[1] : 'なし'}`);
  let age_estimate = null;
  if (ageMatch) {
    const ageOnlyMatch = ageMatch[1].match(/(\d+\s*(?:歳|才|ヶ月|ヵ月|か月))/);
    console.log(`年齢のみマッチ: ${ageOnlyMatch ? ageOnlyMatch[1] : 'なし'}`);
    age_estimate = ageOnlyMatch ? ageOnlyMatch[1].replace(/\s+/g, '') : null;
  }
  console.log(`年齢: ${age_estimate || 'なし'}`);

  const animal_type = text.includes('猫エイズ') || text.includes('猫白血病') ? 'cat' : 'dog';
  console.log(`動物種: ${animal_type}`);

  console.log('\n✅ テスト完了');
}

testOCR().catch(console.error);
