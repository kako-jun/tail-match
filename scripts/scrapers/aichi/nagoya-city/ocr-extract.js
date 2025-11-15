#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像OCR抽出スクリプト（Tesseract.js版）
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
 * 出力: data/ocr/aichi/nagoya-city/extracted_data.json
 */

import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';

const CONFIG = {
  municipality: 'aichi/nagoya-city',
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
 * OCRで抽出したテキストから構造化データを生成
 */
function parseExtractedText(text, externalId) {
  try {
    const lines = text.split('\n').map((l) => l.trim());

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

    // 性別（「オス」「メス」「男の子」「女の子」「雄」「雌」、OCRミス対応）
    let gender = 'unknown';

    // 「性別: 不明」「性別: 未判明」は明示的にunknownとして扱う
    if (text.match(/[性に][別ヨ][:：\s]*(不明|未判明)/)) {
      gender = 'unknown';
    } else {
      // パターン1: 「性別」が正しく認識される場合
      const genderMatch1 = text.match(
        /性\s*別[:：\s]*(オス|メス|メメス|雄|雌|男\s*の\s*子|女\s*の\s*子)/
      );
      if (genderMatch1) {
        const g = genderMatch1[1].replace(/\s+/g, '').replace(/メメス/g, 'メス');
        if (g === 'オス' || g === '雄' || g === '男の子') {
          gender = 'male';
        } else if (g === 'メス' || g === '雌' || g === '女の子') {
          gender = 'female';
        }
      }
      // パターン2: 「性別」がOCRミス（「にヨ別」など）
      else {
        const genderMatch2 = text.match(/[性に][別ヨ][:：\s]*(オス|メス|メメス|雄|雌)/);
        if (genderMatch2) {
          const g = genderMatch2[1].replace(/メメス/g, 'メス');
          if (g === 'オス' || g === '雄') {
            gender = 'male';
          } else if (g === 'メス' || g === '雌') {
            gender = 'female';
          }
        }
      }
    }

    // 年齢（OCRミス対応：「年齢」「年人齢」「年_齢」「年静」など、同一行内で「齢」「静」を含むパターン）
    let age_estimate = null;

    // パターン1: 「年齢: X歳」形式（正常認識）
    const ageMatch1 = text.match(/年[^\n齢静]*[齢静]\s*[:：\s]*([^\n]+)/);
    if (ageMatch1) {
      // 「6歳」「5カ月」「3週」「1歳半」のような部分だけを抽出
      // OCR誤認識対応: カ月（カタカナのカ） → ヵ月（小さいヵ）
      const ageOnlyMatch = ageMatch1[1].match(
        /(\d+\s*(?:歳\s*半|歳|才|ヶ月|ヵ月|カ月|か月|週間|週))/
      );
      if (ageOnlyMatch) {
        age_estimate = ageOnlyMatch[1].replace(/\s+/g, '').replace(/カ月/g, 'ヵ月');
      } else {
        // パターン2: 「年齢: 10」のように数字のみ（歳が認識されていない）
        const numberOnlyMatch = ageMatch1[1].match(/(\d+)/);
        if (numberOnlyMatch) {
          age_estimate = `${numberOnlyMatch[1]}歳`;
        }
      }
    }

    // パターン3: 「年齢」が認識されていない場合、「齢」「静」だけを探す
    if (!age_estimate) {
      const ageMatch2 = text.match(
        /[齢静]\s*[:：\s]*(\d+\s*(?:歳\s*半|歳|才|ヶ月|ヵ月|カ月|か月|週間|週))/
      );
      if (ageMatch2) {
        age_estimate = ageMatch2[1].replace(/\s+/g, '').replace(/カ月/g, 'ヵ月');
      }
    }

    // パターン4: 「推定」「准定」などから探す（年齢行が全く認識されていない場合）
    if (!age_estimate) {
      const ageMatch3 = text.match(
        /(?:推\s*定|准\s*定)\s*(\d+\s*(?:歳\s*半|歳|才|ヶ月|ヵ月|カ月|か月|週間|週))/
      );
      if (ageMatch3) {
        age_estimate = `推定${ageMatch3[1].replace(/\s+/g, '').replace(/カ月/g, 'ヵ月')}`;
      }
    }

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
  console.log('🐱🐕 名古屋市動物愛護センター - 画像OCR抽出（Tesseract.js）');
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
