#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像OCR抽出スクリプト
 *
 * Google Cloud Vision APIを使用して画像から情報を自動抽出します
 *
 * 使い方:
 * 1. Google Cloud Vision APIを有効化
 * 2. サービスアカウントキーをダウンロード
 * 3. GOOGLE_APPLICATION_CREDENTIALS環境変数を設定
 *    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
 * 4. npm install @google-cloud/vision
 * 5. node ocr-extract.js
 *
 * 無料枠: 月1,000リクエストまで無料
 * 出力: data/ocr/aichi/nagoya-city/extracted_data.json
 */

import fs from 'fs';
import path from 'path';
import vision from '@google-cloud/vision';

const CONFIG = {
  municipality: 'aichi/nagoya-city',
  batchSize: 10, // 一度に処理する画像数
};

/**
 * Google Cloud Vision APIでOCR実行
 */
async function extractTextFromImage(client, imagePath) {
  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    return null;
  }

  // 全テキストを取得（最初の要素が全体のテキスト）
  return detections[0].description;
}

/**
 * OCRで抽出したテキストから構造化データを生成
 */
function parseExtractedText(text, externalId) {
  try {
    const lines = text.split('\n').map((l) => l.trim());

    // お問い合わせ番号（右上の大きな数字）
    const inquiryMatch = text.match(/(\d{4})/);
    const inquiry_number = inquiryMatch ? inquiryMatch[1] : null;

    // 種類・品種
    const breedMatch = text.match(/種\s*類[:：\s]*(.+)/);
    const breed = breedMatch ? breedMatch[1].trim() : null;

    // 毛色
    const colorMatch = text.match(/毛\s*色[:：\s]*(.+)/);
    const color = colorMatch ? colorMatch[1].trim() : null;

    // 性別
    const genderMatch = text.match(/性\s*別[:：\s]*(オス|メス|雄|雌)/);
    let gender = 'unknown';
    if (genderMatch) {
      const g = genderMatch[1];
      gender = g === 'オス' || g === '雄' ? 'male' : 'female';
    }

    // 年齢
    const ageMatch = text.match(/年\s*齢[:：\s]*(.+)/);
    const age_estimate = ageMatch ? ageMatch[1].trim() : null;

    // 健康状態（複数行にまたがる可能性）
    const healthParts = [];
    if (text.includes('避妊去勢')) {
      healthParts.push(text.match(/避妊去勢[:：\s]*(済|未実施|無)/)?.[0] || '避妊去勢済');
    }
    if (text.includes('マイクロチップ')) {
      healthParts.push(text.match(/マイクロチップ[:：\s]*(有|無)/)?.[0] || 'マイクロチップ無');
    }
    if (text.includes('健康状態')) {
      healthParts.push('良好');
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

async function extractFromImage(client, imagePath, externalId) {
  try {
    console.log(`\n📸 処理中: ${externalId}`);

    // OCR実行
    const text = await extractTextFromImage(client, imagePath);

    if (!text) {
      console.error(`❌ OCR失敗: ${externalId}`);
      return null;
    }

    // テキストから構造化データを抽出
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
  console.log('🐱🐕 名古屋市動物愛護センター - 画像OCR抽出');
  console.log('='.repeat(60) + '\n');

  // Google Cloud認証確認
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS環境変数が設定されていません');
    console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"');
    console.error('\n   Google Cloud Vision APIの設定方法:');
    console.error('   1. https://console.cloud.google.com/ でプロジェクト作成');
    console.error('   2. Vision API を有効化');
    console.error('   3. サービスアカウント作成 → キーをダウンロード');
    console.error('   4. npm install @google-cloud/vision');
    process.exit(1);
  }

  const client = new vision.ImageAnnotatorClient();

  // 画像ディレクトリ取得
  const imagesDir = path.join(
    process.cwd(),
    'data',
    'images',
    CONFIG.municipality.replace('/', path.sep)
  );

  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ 画像ディレクトリが見つかりません: ${imagesDir}`);
    process.exit(1);
  }

  // 画像ファイル一覧取得
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort();

  console.log(`📊 画像数: ${imageFiles.length}\n`);

  const extractedData = {};
  let processedCount = 0;
  let errorCount = 0;

  // バッチ処理
  for (let i = 0; i < imageFiles.length; i += CONFIG.batchSize) {
    const batch = imageFiles.slice(i, i + CONFIG.batchSize);

    console.log(
      `\n📦 バッチ ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(imageFiles.length / CONFIG.batchSize)}`
    );
    console.log(
      `   処理: ${i + 1}～${Math.min(i + CONFIG.batchSize, imageFiles.length)}/${imageFiles.length}`
    );

    for (const imageFile of batch) {
      const imagePath = path.join(imagesDir, imageFile);
      const externalId = imageFile.replace('nagoya-', '').replace('.jpg', '');

      const data = await extractFromImage(client, imagePath, externalId);

      if (data) {
        extractedData[externalId] = data;
        processedCount++;
      } else {
        errorCount++;
      }

      // 少し待機（サーバー負荷軽減）
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 結果を保存
  const outputDir = path.join(
    process.cwd(),
    'data',
    'ocr',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'extracted_data.json');
  fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log('✅ OCR抽出完了');
  console.log('='.repeat(60));
  console.log(`📊 処理数: ${processedCount}/${imageFiles.length}`);
  console.log(`❌ エラー: ${errorCount}`);
  console.log(`💾 出力: ${outputFile}`);
  console.log('\n次のステップ:');
  console.log('  node update-yaml-from-images.js');
}

main().catch(console.error);
