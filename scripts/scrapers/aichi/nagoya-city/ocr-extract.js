#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像OCR抽出スクリプト
 *
 * Claude Vision APIを使用して画像から情報を自動抽出します
 *
 * 使い方:
 * 1. ANTHROPIC_API_KEY環境変数を設定
 * 2. node ocr-extract.js
 *
 * 出力: data/ocr/aichi/nagoya-city/extracted_data.json
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const CONFIG = {
  municipality: 'aichi/nagoya-city',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,
  batchSize: 5, // 一度に処理する画像数
};

const EXTRACTION_PROMPT = `この画像は名古屋市動物愛護センターの譲渡動物情報です。
以下の情報をJSON形式で抽出してください。読み取れない項目はnullにしてください。

必須情報:
- inquiry_number: お問い合わせ番号（右上の数字）
- animal_type: 動物種（"cat" または "dog"）
- breed: 種類（品種）
- color: 毛色
- gender: 性別（"male", "female", "unknown"）
- age_estimate: 年齢（例: "10歳", "1歳7ヶ月"）
- health_status: 健康状態（避妊去勢、マイクロチップ、猫エイズ検査、猫白血病検査、ワクチンの情報をまとめて）
- personality: 性格
- special_needs: 募集の経緯

JSONフォーマット:
{
  "inquiry_number": "2389",
  "animal_type": "cat",
  "breed": "雑種",
  "color": "茶トラ",
  "gender": "male",
  "age_estimate": "10歳",
  "health_status": "良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済(2020年12月)",
  "personality": "おとなしい",
  "special_needs": "現在飼っている住居が身内の不幸により、立ち退きする為"
}

JSONのみを返してください。説明文は不要です。`;

async function extractFromImage(client, imagePath, externalId) {
  try {
    console.log(`\n📸 処理中: ${externalId}`);

    // 画像を読み込み
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Claude Vision APIで抽出
    const message = await client.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // レスポンスからJSONを抽出
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error(`❌ JSON抽出失敗: ${externalId}`);
      return null;
    }

    const extractedData = JSON.parse(jsonMatch[0]);
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

  // APIキー確認
  if (!CONFIG.apiKey) {
    console.error('❌ ANTHROPIC_API_KEY環境変数が設定されていません');
    console.error('   export ANTHROPIC_API_KEY=your-api-key');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: CONFIG.apiKey });

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

      // APIレート制限対策
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
