#!/usr/bin/env node

/**
 * 横浜市動物愛護センター 画像から抽出した情報でYAML更新
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import yaml from 'js-yaml';

// ========================================
// 画像から抽出した情報
// ========================================

const extractedData = {
  134: {
    age_estimate: '推定12歳',
    gender: 'male',
    breed: 'キジトラ',
    color: 'キジトラ',
    health_status: '去勢手術済み、3種混合ワクチン接種済',
    personality: 'マイペースでのんびりした性格。なでられると気持ちよさそうにしています。',
    protection_date: '2025-10-15',
  },
  133: {
    age_estimate: '推定9歳',
    gender: 'female',
    breed: '長毛キジトラ白',
    color: 'キジトラ白',
    health_status: '不妊手術済み、3種混合ワクチン接種済',
    personality: '人懐っこく、甘えん坊な性格です。なでられるのが大好きです。',
    protection_date: '2025-07-14',
  },
  132: {
    age_estimate: '推定2歳',
    gender: 'female',
    breed: 'キジトラ白',
    color: 'キジトラ白',
    health_status: '不妊手術済み、3種混合ワクチン接種済',
    personality: '人懐っこく、好奇心旺盛な性格です。なでられるのが大好きです。',
    protection_date: '2025-10-02',
  },
  131: {
    age_estimate: '推定24歳',
    gender: 'male',
    breed: 'キジトラ白',
    color: 'キジトラ白',
    health_status: '去勢手術済み、3種混合ワクチン接種済',
    personality: '人懐っこく、甘えん坊な性格です。なでられるのが大好きです。',
    protection_date: null,
  },
  130: {
    age_estimate: '推定14歳',
    gender: 'male',
    breed: 'キジトラ白',
    color: 'キジトラ白',
    health_status:
      '3種混合ワクチン接種済、去勢手術未実施。健康状態について留意事項があります。詳細はお問合せください。',
    personality: '人懐っこく、甘えん坊な性格です。マイペースで気分屋さんなところがあります。',
    special_needs: '健康状態について留意事項があります',
    protection_date: '2025-07-31',
  },
  110: {
    age_estimate: '推定9歳',
    gender: 'male',
    breed: 'キジトラ',
    color: 'キジトラ',
    health_status: '去勢手術済み、3種混合ワクチン接種済',
    personality:
      '甘えん坊で、活発な性格です。常にスリスリしています。急な動作でびっくりしてしまうので、ゆったりと接してあげてください。',
    protection_date: '2025-07-24',
  },
  114: {
    age_estimate: '推定5歳',
    gender: 'male',
    breed: '茶トラ',
    color: '茶トラ',
    health_status: '去勢手術済み、3種混合ワクチン接種済',
    personality:
      '環境の変化は苦手なようですが、慣れると気持ち良さそうに目向はつこをしています。かなりの食いしん坊です。猫じゃらしでよく遊びます。',
    protection_date: '2024-02-09',
  },
  111: {
    age_estimate: '推定9歳',
    gender: 'female',
    breed: '茶トラ白',
    color: '茶トラ白',
    health_status: '不妊手術済み、3種混合ワクチン接種済',
    personality:
      'とても慎重な性格です。触ると緊張で固まってしまいます。慣れるまでに少し時間がかかります。',
    protection_date: '2024-03-14',
  },
  946: {
    age_estimate: '推定14歳',
    gender: 'female',
    breed: '白黒',
    color: '白黒',
    health_status: '不妊手術済み、3種混合ワクチン接種済',
    personality: '慣れるまで少し時間がかかるかもしれません。なでてもらうのが好きです。',
    protection_date: '2023-08-24',
  },
};

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 横浜市動物愛護センター - YAML更新');
  console.log('='.repeat(60) + '\n');

  // 画像から作成したYAMLファイルを読み込み
  const yamlDir = path.join(process.cwd(), 'data', 'yaml', 'kanagawa', 'yokohama-city');
  const yamlFiles = fs
    .readdirSync(yamlDir)
    .filter((f) => f.includes('_with_images.yaml'))
    .sort()
    .reverse();

  if (yamlFiles.length === 0) {
    console.error('❌ YAMLファイルが見つかりません');
    process.exit(1);
  }

  const yamlPath = path.join(yamlDir, yamlFiles[0]);
  console.log(`📄 読み込み: ${path.basename(yamlPath)}\n`);

  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const data = yaml.load(yamlContent);

  // 各猫の情報を更新
  let updatedCount = 0;
  for (const animal of data.animals) {
    const inquiryNumber = animal.inquiry_number;
    if (extractedData[inquiryNumber]) {
      const extracted = extractedData[inquiryNumber];

      animal.age_estimate = extracted.age_estimate;
      animal.gender = extracted.gender;
      animal.breed = extracted.breed;
      animal.color = extracted.color;
      animal.health_status = extracted.health_status;
      animal.personality = extracted.personality;
      if (extracted.special_needs) {
        animal.special_needs = extracted.special_needs;
      }
      if (extracted.protection_date) {
        animal.protection_date = extracted.protection_date;
      }

      // confidence_levelを更新
      animal.confidence_level = 'high';
      animal.needs_review = false;
      animal.extraction_notes = ['画像から情報を抽出済み'];

      updatedCount++;
      console.log(
        `✅ 更新: お問合せ番号-${inquiryNumber} (${extracted.gender}, ${extracted.age_estimate})`
      );
    }
  }

  // メタ情報を更新
  data.meta.extraction_type = 'image_ocr_completed';
  data.meta.note = '画像から情報を抽出済み。譲渡動物情報（新しい飼い主募集中）';
  data.confidence_level = 'high';
  data.consistency_warnings = [];

  // 新しいYAMLファイルとして保存
  const timestamp = getJSTTimestamp();
  const outputFile = path.join(yamlDir, `${timestamp}_tail.yaml`);

  const newYamlContent = yaml.dump(data, { indent: 2, lineWidth: -1 });
  fs.writeFileSync(outputFile, newYamlContent, 'utf-8');

  console.log(`\n✅ YAML更新完了: ${outputFile}`);
  console.log(`📊 更新数: ${updatedCount}匹`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 処理完了');
  console.log('='.repeat(60));
}

// 実行
main();
