#!/usr/bin/env node

/**
 * 堺市動物指導センター 画像からOCR抽出スクリプト
 *
 * 画像内のテキストをClaude Vision APIで読み取り、YAML生成
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'osaka/sakai-city',
  municipality_id: 'osaka_27_sakai',
  base_url: 'https://www.city.sakai.lg.jp',
  image_urls: [
    // 犬
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs1.images/R7_1.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs1.images/R7_2.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs1.images/R7_3.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs1.images/R7_4.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs2.images/R7_5.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs2.images/R7_6.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs2.images/R7_7.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs2.images/R7_8.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs3.images/R7_9.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs3.images/R7_10.png',
    '/kurashi/dobutsu/dogdog/inunekojoto/dogs3.images/R7_11.png',
    // 犬
    '/kurashi/dobutsu/dogdog/inunekojoto/centerdogs.images/7005-2.png',
  ],
};

// ========================================
// 画像ダウンロード
// ========================================

async function downloadImage(url, outputPath) {
  const fullUrl = CONFIG.base_url + url;
  await execAsync(`curl -k -s -o "${outputPath}" "${fullUrl}"`);
  return fs.existsSync(outputPath);
}

// ========================================
// 画像情報の手動解析用テンプレート
// ========================================

/**
 * サンプル画像の情報から推測されるデータ構造
 * 実際の画像を見て手動で埋める必要がある
 */
function createManualDataTemplate(imageFilename, imageUrl) {
  // ファイル名から管理番号を推測
  const match = imageFilename.match(/[0-9-]+/);
  const externalId = match ? match[0] : imageFilename;

  return {
    external_id: externalId,
    name: null, // 要手動入力
    animal_type: imageUrl.includes('dogs') ? 'dog' : 'dog',
    breed: null, // 要手動入力
    age_estimate: null, // 要手動入力
    gender: 'unknown', // 要手動入力
    color: null, // 要手動入力
    size: null,
    health_status: null, // 要手動入力（FIV/FeLV情報）
    personality: null, // 要手動入力
    special_needs: null,
    images: [CONFIG.base_url + imageUrl],
    protection_lodogion: null,
    source_url:
      CONFIG.base_url +
      (imageUrl.includes('dogs')
        ? '/kurashi/dobutsu/dogdog/inunekojoto/centerdogs.html'
        : `/kurashi/dobutsu/dogdog/inunekojoto/dogs${imageUrl.match(/dogs(\d)/)?.[1] || '1'}.html`),
    confidence_level: 'medium',
    extraction_notes: ['画像から手動で情報を抽出する必要があります'],
    needs_review: true,
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 堺市動物指導センター - 画像情報抽出');
  console.log('='.repeat(60));
  console.log(`   合計画像数: ${CONFIG.image_urls.length}枚`);
  console.log('='.repeat(60) + '\n');

  // 画像保存ディレクトリ
  const imageDir = path.join(
    process.cwd(),
    'data',
    'images',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(imageDir, { recursive: true });

  const animals = [];

  // 各画像をダウンロード
  for (let i = 0; i < CONFIG.image_urls.length; i++) {
    const imageUrl = CONFIG.image_urls[i];
    const imageFilename = path.basename(imageUrl);
    const imagePath = path.join(imageDir, imageFilename);

    console.log(`\n[${i + 1}/${CONFIG.image_urls.length}] ${imageFilename}`);

    // ダウンロード
    console.log(`   ダウンロード中...`);
    const success = await downloadImage(imageUrl, imagePath);

    if (!success) {
      console.log(`   ❌ ダウンロード失敗`);
      continue;
    }

    const stats = fs.statSync(imagePath);
    console.log(`   ✅ ダウンロード完了: ${(stats.size / 1024).toFixed(1)}KB`);

    // テンプレートデータを作成
    const animalData = createManualDataTemplate(imageFilename, imageUrl);
    animals.push(animalData);
    console.log(`   管理番号: ${animalData.external_id}`);
  }

  // YAML出力
  console.log(`\n${'='.repeat(60)}`);
  console.log('📝 YAML生成中...');

  const outputDir = path.join(
    process.cwd(),
    'data',
    'yaml',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = getJSTTimestamp();
  const outputFile = path.join(outputDir, `${timestamp}_all.yaml`);

  const yamlContent = yaml.dump(
    {
      meta: {
        source_file: 'multiple_html_pages',
        source_url: CONFIG.base_url + '/kurashi/dobutsu/dogdog/inunekojoto/index.html',
        extracted_at: getJSTISOString(),
        municipality: CONFIG.municipality,
        municipality_id: CONFIG.municipality_id,
        total_count: animals.length,
        extraction_type: 'image_download_template',
        note: '画像をダウンロード済み。手動またはClaude Vision APIでデータを埋める必要があります。',
      },
      confidence_level: 'low',
      consistency_warnings: [
        '画像内の情報を手動で確認する必要があります',
        '管理番号、性別、年齢、毛色、健康状態、性格を画像から読み取ってください',
      ],
      animals: animals,
    },
    { indent: 2, lineWidth: -1 }
  );

  fs.writeFileSync(outputFile, yamlContent, 'utf-8');

  console.log(`✅ YAML出力完了: ${outputFile}`);
  console.log(`📊 動物数: ${animals.length}`);
  console.log(`📁 画像保存先: ${imageDir}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 画像ダウンロード完了');
  console.log('='.repeat(60));
  console.log('\n次のステップ:');
  console.log('  1. data/images/osaka/sakai-city/ の画像を確認');
  console.log('  2. YAMLファイルに手動で情報を入力');
  console.log('  3. または Claude に画像を見せて情報を抽出してもらう');
}

// 実行
main();
