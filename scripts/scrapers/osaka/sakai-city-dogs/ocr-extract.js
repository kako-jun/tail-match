#!/usr/bin/env node

/**
 * 堺市動物指導センター（犬）画像OCR抽出スクリプト（Tesseract.js版）
 *
 * Tesseract.jsを使用して画像から情報を自動抽出します
 * APIキー不要・完全ローカル実行で持続可能
 *
 * 使い方:
 * 1. npm install tesseract.js
 * 2. node ocr-extract.js
 *
 * 利点:
 * - ✅ APIキー不要（完全ローカル実行）
 * - ✅ 無制限に使用可能
 * - ✅ 日本語OCR精度が高い
 *
 * 出力: data/ocr/osaka/sakai-city-dogs/extracted_data.json
 */

import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';

const CONFIG = {
  municipality: 'osaka/sakai-city-dogs',
  batchSize: 5, // 一度に処理する画像数（Tesseractは重いので少なめ）
};

/**
 * Tesseract.jsでOCR実行（日本語最適化）
 */
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

/**
 * OCRで抽出したテキストから構造化データを生成（堺市フォーマット）
 */
function parseExtractedText(text, externalId) {
  try {
    // スペースを除去（OCRで文字間にスペースが入る）
    const cleanText = text.replace(/\s+/g, '');

    // 堺市はお問い合わせ番号がないのでnull
    let inquiry_number = null;

    // 年齢（堺市フォーマット: 「推定X歳」「准定X歳」「約X歳」「X歳」）
    let age_estimate = null;
    // まず「推定X歳」「准定X歳」「約X歳」パターンを探す
    const ageMatch1 = text.match(/(?:推\s*定|准\s*定|約)\s*(\d+)\s*歳/);
    if (ageMatch1) {
      age_estimate = `推定${ageMatch1[1]}歳`;
    } else {
      // 単独の「X歳」パターン（/の後に数字＋歳）
      const ageMatch2 = text.match(/\/\s*(\d+)\s*歳/);
      if (ageMatch2) {
        age_estimate = `${ageMatch2[1]}歳`;
      }
    }

    // 性別・去勢情報（堺市フォーマット: 「男の子(去勢済)」「女の子(避妊済)」「女の子(部妊済)」）
    let gender = 'unknown';
    let health_status_parts = [];

    // 「男の子(去勢済)」パターン
    if (text.match(/男\s*の\s*子\s*[（(]\s*去\s*勢\s*済/)) {
      gender = 'male';
      health_status_parts.push('去勢手術済');
    }
    // 「女の子(避妊済)」「女の子(部妊済)」パターン（OCRミス対応）
    else if (text.match(/女\s*の\s*子\s*[（(]\s*(?:避\s*妊|部\s*妊)\s*済/)) {
      gender = 'female';
      health_status_parts.push('避妊手術済');
    }
    // フォールバック：「男の子」「女の子」だけ
    else if (text.match(/男\s*の\s*子/)) {
      gender = 'male';
    } else if (text.match(/女\s*の\s*子/)) {
      gender = 'female';
    }
    // さらにフォールバック：「オス」「メス」
    else if (cleanText.includes('オス')) {
      gender = 'male';
    } else if (cleanText.includes('メス')) {
      gender = 'female';
    }

    // ワクチン情報
    if (cleanText.includes('混合ワクチン') || cleanText.includes('ワクチン接種')) {
      health_status_parts.push('ワクチン接種済');
    }

    // FIV/FeLV検査結果（堺市特有）
    if (text.match(/FIV\s*\/\s*FeLV\s*陰\s*性/) || cleanText.includes('FIV/FeLV陰性')) {
      health_status_parts.push('FIV/FeLV陰性');
    } else if (text.match(/FIV\s*\/\s*FeLV\s*誰\s*性/)) {
      // OCRミス: 「陰性」が「誰性」になることがある
      health_status_parts.push('FIV/FeLV陰性');
    }

    const health_status = health_status_parts.length > 0 ? health_status_parts.join('、') : null;

    // 性格（文章形式で記載されている）
    // 「甘えん坊で、活発な性格です」のようなパターンを抽出
    let personality = null;

    // 「性格です」で終わる文を探す（最も一般的なパターン）
    const personalityMatch1 = text.match(/([^\n。]+性\s*格\s*で\s*す)/);
    if (personalityMatch1) {
      let rawPersonality = personalityMatch1[1].replace(/\s+/g, '');

      // ノイズ除去：性格を表す形容詞の直前までを削除
      const personalityStartPatterns = [
        /(怖がり|慎重|活発|おっとり|甘えん坊|人懐っ|人なつ|臆病|元気|大人|穏やか|落ち着|マイペース|用病|病気)/, // 「用病」は「臆病」のOCR誤認識
      ];

      for (const pattern of personalityStartPatterns) {
        const startMatch = rawPersonality.match(pattern);
        if (startMatch) {
          const startIdx = rawPersonality.indexOf(startMatch[0]);
          personality = rawPersonality.substring(startIdx);
          break;
        }
      }

      // パターンにマッチしない場合は元の文を使用
      if (!personality) {
        personality = rawPersonality;
      }
    }

    // 「性格です」がない場合、性格を表す形容詞を含む文を探す
    if (!personality) {
      const personalityPatterns = [
        /([ぁ-ん]+\s*(?:ん\s*坊|的|気味)(?:で|な|、)[^\n。]+(?:です|ます))/, // 「甘えん坊で...です」
        /((?:怖\s*が\s*り|慎\s*重|活\s*発|おっ\s*とり|人\s*な\s*つっ\s*こい)[^\n。]+(?:です|ます))/, // 「怖がりで...です」
      ];

      for (const pattern of personalityPatterns) {
        const match = text.match(pattern);
        if (match) {
          personality = match[1].replace(/\s+/g, '');
          break;
        }
      }
    }

    // 品種・毛色（堺市フォーマット: 「品種 / 性別 / 年齢 / 毛色」）
    let breed = null;
    let color = null;

    // 品種抽出（スラッシュで区切られた最初の部分、性別情報の前）
    const breedMatch = text.match(/([^\n\/]+)\s*\/\s*(?:男|女)\s*の\s*子/);
    if (breedMatch) {
      // 最後の単語部分を抽出（前のノイズを除去）
      const breedText = breedMatch[1].trim();
      const breedWords = breedText.split(/\s+/);
      breed = breedWords[breedWords.length - 1];
    }

    // 毛色抽出（年齢の後のスラッシュ以降）
    const colorMatch = text.match(/(\d+)\s*歳\s*[\/／]\s*([^\n\/]+?)(?:\s|$|FIV)/);
    if (colorMatch) {
      // 最初の単語部分を抽出
      const colorText = colorMatch[2].trim();
      const colorWords = colorText.split(/\s+/);
      color = colorWords[0];
    }

    // 特別な配慮事項（「急な動作でびっくりしてしまう」などのパターン）
    let special_needs = null;
    if (text.match(/急\s*な\s*動\s*作/)) {
      special_needs = '急な動作でびっくりしてしまうので、ゆったりと接してください';
    }

    // 動物種判定（犬専用ページなので固定）
    const animal_type = 'dog';

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

    // OCR実行
    const text = await extractTextFromImage(worker, imagePath);

    if (!text) {
      console.error(`❌ OCR失敗: ${externalId}`);
      return null;
    }

    // デバッグ用：抽出されたテキストを表示（コメントアウト）
    // console.log(`📝 OCR結果（最初の100文字）: ${text.substring(0, 100)}...`);

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
  console.log('🐕 堺市動物指導センター（犬）- 画像OCR抽出（Tesseract.js）');
  console.log('='.repeat(60) + '\n');

  // Tesseract.js ワーカー初期化（日本語＋英語）
  console.log('⚙️  Tesseract.js 初期化中...');
  const worker = await createWorker('jpn+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        // 進捗表示は最小限に
        if (m.progress === 1) {
          console.log(`   認識完了`);
        }
      }
    },
  });

  // PSM（Page Segmentation Mode）を設定
  // PSM 6 = 単一の均一なテキストブロックと仮定（精度重視）
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });

  console.log('✅ Tesseract.js 初期化完了\n');

  // 画像ディレクトリ取得
  // 堺市の場合は sakai-city-dogs ディレクトリを使用
  const imagesDirPath = CONFIG.municipality.replace('/', path.sep);
  const imagesDir = path.join(process.cwd(), 'data', 'images', imagesDirPath);

  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ 画像ディレクトリが見つかりません: ${imagesDir}`);
    await worker.terminate();
    process.exit(1);
  }

  // 画像ファイル一覧取得（.jpg/.JPG/.png すべてに対応）
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => f.endsWith('.jpg') || f.endsWith('.JPG') || f.endsWith('.png'))
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
      const externalId = imageFile.replace('yokohama-', '').replace('.jpg', '');

      const data = await extractFromImage(worker, imagePath, externalId);

      if (data) {
        extractedData[externalId] = data;
        processedCount++;
      } else {
        errorCount++;
      }
    }
  }

  // ワーカー終了
  await worker.terminate();

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
