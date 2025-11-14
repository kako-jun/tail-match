#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像から抽出した情報でYAML更新
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import yaml from 'js-yaml';

// ========================================
// 画像から抽出した情報
// ========================================

const extractedData = {
  '251114-001': {
    inquiry_number: '2389',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '10歳',
    gender: 'male',
    color: '茶トラ',
    health_status:
      '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済(2020年12月)',
    personality: 'おとなしい',
    special_needs: '現在飼っている住居が身内の不幸により、立ち退きする為',
  },
  '251114-002': {
    inquiry_number: '2390',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '7歳',
    gender: 'female',
    color: 'キジトラ',
    health_status:
      '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済(2020年7月)',
    personality: '活発',
    special_needs: '現在飼っている住居が身内の不幸により、立ち退きする為',
  },
  '251114-003': {
    inquiry_number: '2391',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '7歳',
    gender: 'female',
    color: 'キジトラ',
    health_status:
      '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済(2021年12月)',
    personality: 'おとなしい',
    special_needs: '現在飼っている住居が身内の不幸により、立ち退きする為',
  },
  '251114-004': {
    inquiry_number: '2392',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '5歳',
    gender: 'female',
    color: '三毛',
    health_status:
      '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済(2021年10月)',
    personality: '臆病',
    special_needs: '現在飼っている住居が身内の不幸により、立ち退きする為',
  },
  '251113-001': {
    inquiry_number: '2385',
    animal_type: 'cat',
    breed: 'ラグドール',
    age_estimate: '8歳',
    gender: 'female',
    color: 'ブルーポイントバイカラー',
    health_status:
      '良好、避妊去勢済、マイクロチップ有、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済',
    personality: '穏やか、かなり甘えん坊で独占欲が強い、攻撃的',
    special_needs: '家庭の事情で飼育が困難になったため。妹妹が強いので、できれば先住猫のいない家庭',
  },
  '251113-002': {
    inquiry_number: '2386',
    animal_type: 'cat',
    breed: 'ブリティッシュショートヘアー',
    age_estimate: '10歳',
    gender: 'female',
    color: 'ブルー',
    health_status:
      '良好、避妊去勢済、マイクロチップ有、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済',
    personality: 'おとなしい、温厚',
    special_needs:
      '家庭の事情で飼育が困難になったため。動けると甘えん坊なため、その要望に答えてくださる方',
  },
  '251113-003': {
    inquiry_number: '2387',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '5～6歳',
    gender: 'female',
    color: '黒(エンジェルマーク有)',
    health_status: '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済',
    personality:
      '大人しく臆病。猫じゃらして遊ぶのが好き・撫でられる事が好き・ブラッシング大好き。夜はトイレなど人を起こさないように抜き足差し足で人のリズムに合わせて暮らせる気遣い出来る猫です。',
    special_needs:
      'お外でお世話をしていたが勝手に玄関にあったキャリーに入り暮らし始めたので保護しました。',
  },
  '251113-004': {
    inquiry_number: '2388',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '1歳7ヶ月',
    gender: 'female',
    color: 'キジ白(キジ柄が明るめ茶色)',
    health_status: '良好、避妊去勢済、猫エイズ検査陰性、猫白血病検査陰性、ワクチン接種済',
    personality: 'ボールや猫じゃらして上手に遊べて好奇心旺盛。ご機嫌上手で触ってもそこまで大好き。',
    special_needs:
      '家の敷地に来る野良猫を保護したが病気の保護猫がいるので飼えない。希望者様に送り事項としてあげたが、一緒に遊んだりする時間を確保して頂けたら嬉しいです。',
  },
  '251112-001': {
    inquiry_number: '2375',
    animal_type: 'cat',
    breed: '雑種',
    age_estimate: '6歳',
    gender: 'male',
    color: '白',
    health_status: '良好、避妊去勢済、猫エイズ検査未検査、猫白血病検査未検査、ワクチン未接種',
    personality: '心優しく小心者、見た目とのギャップにびっくり',
    special_needs: '転居のため。',
  },
};

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱🐕 名古屋市動物愛護センター - YAML更新');
  console.log('='.repeat(60) + '\n');

  // 画像から作成したYAMLファイルを読み込み
  const yamlDir = path.join(process.cwd(), 'data', 'yaml', 'aichi', 'nagoya-city');
  const yamlFiles = fs
    .readdirSync(yamlDir)
    .filter((f) => f.includes('_images_template.yaml'))
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

  // 各動物の情報を更新
  let updatedCount = 0;
  for (const animal of data.animals) {
    const dateCode = animal.external_id.replace('nagoya-', '');
    if (extractedData[dateCode]) {
      const extracted = extractedData[dateCode];

      animal.animal_type = extracted.animal_type;
      animal.breed = extracted.breed;
      animal.age_estimate = extracted.age_estimate;
      animal.gender = extracted.gender;
      animal.color = extracted.color;
      animal.health_status = extracted.health_status;
      animal.personality = extracted.personality;
      animal.special_needs = extracted.special_needs;

      // confidence_levelを更新
      animal.confidence_level = 'high';
      animal.needs_review = false;
      animal.extraction_notes = [
        '画像から情報を抽出済み',
        `お問合せ番号: ${extracted.inquiry_number}`,
      ];

      updatedCount++;
      console.log(
        `✅ 更新: ${animal.external_id} (${extracted.animal_type}, ${extracted.gender}, ${extracted.age_estimate})`
      );
    } else {
      console.log(`⚠️  スキップ: ${animal.external_id} (抽出データなし)`);
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
