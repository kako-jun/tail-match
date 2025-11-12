#!/usr/bin/env node

/**
 * YAML → Database 投入スクリプト
 *
 * 目的：検証済みYAMLファイルからSQLiteデータベースに投入
 * 利点：
 * - YAMLで人間が確認・修正済みのデータのみ投入
 * - バッチ処理で複数ファイルを一括投入可能
 * - ロールバック可能（トランザクション対応）
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { initializeDatabase, closeDatabase } from './lib/db.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  yamlInputDir: 'data/yaml',
  municipalities: ['ishikawa/aigo-ishikawa', 'ishikawa/kanazawa-city', 'toyama/toyama-pref'], // 複数自治体対応
  dryRun: process.argv.includes('--dry-run'), // --dry-run で実際の投入をスキップ
  skipReview: process.argv.includes('--skip-review'), // --skip-review でレビューフラグを無視
};

// ========================================
// YAML読み込み・検証
// ========================================

/**
 * YAMLファイルを読み込んで検証
 */
function loadAndValidateYAML(yamlFilePath) {
  try {
    const yamlContent = fs.readFileSync(yamlFilePath, 'utf-8');
    const data = yaml.load(yamlContent);

    // 基本構造の検証
    if (!data.meta || !data.animals || !Array.isArray(data.animals)) {
      throw new Error('YAML構造が不正です（meta, animalsが必要）');
    }

    // 信頼度レベルの確認
    if (data.confidence_level === 'critical' && !CONFIG.skipReview) {
      console.warn(`⚠️  警告: ${path.basename(yamlFilePath)} は信頼度CRITICALです`);
      console.warn('   手動確認を推奨します。--skip-review で強制投入可能');
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ YAML読み込みエラー (${path.basename(yamlFilePath)}):`, error.message);
    return null;
  }
}

/**
 * 動物データの妥当性チェック
 */
function validateAnimalData(animal, index) {
  const errors = [];

  // 必須フィールドのチェック
  if (!animal.external_id) {
    errors.push(`external_id が未設定`);
  }

  // needs_review フラグのチェック
  if (animal.needs_review && !CONFIG.skipReview) {
    errors.push(`レビューが必要とマークされています`);
  }

  return errors;
}

/**
 * 名前がない場合にデフォルト名を生成
 */
function generateDefaultName(animal) {
  if (!animal.name || animal.name.includes('保護動物')) {
    // external_idから番号を抽出してデフォルト名を生成
    const idMatch = animal.external_id?.match(/\d+/);
    const number = idMatch ? idMatch[0] : 'unknown';

    // 動物種別に応じた名前を生成
    let prefix = '保護動物';
    if (animal.animal_type === 'cat') {
      prefix = '保護猫';
    } else if (animal.animal_type === 'dog') {
      prefix = '保護犬';
    }

    return `${prefix}${number}号`;
  }
  return animal.name;
}

// ========================================
// データベース投入
// ========================================

/**
 * YAMLからデータベースへ投入
 */
function importYAMLToDB(yamlData, db, yamlFilename) {
  const stats = {
    total: yamlData.animals.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(`\n📄 処理中: ${yamlFilename}`);
  console.log(`   動物数: ${stats.total}匹`);
  console.log(`   信頼度: ${yamlData.confidence_level?.toUpperCase() || 'UNKNOWN'}`);

  // 整合性警告の表示
  if (yamlData.consistency_warnings && yamlData.consistency_warnings.length > 0) {
    console.log(`   警告: ${yamlData.consistency_warnings.length}件`);
    yamlData.consistency_warnings.forEach((warning) => {
      console.log(`     - ${warning}`);
    });
  }

  // 各動物データを投入
  yamlData.animals.forEach((animal, index) => {
    // エラーエントリはスキップ
    if (animal.extraction_error) {
      console.log(`   ⏭️  スキップ ${index + 1}: 抽出エラー`);
      stats.skipped++;
      return;
    }

    // 妥当性チェック
    const validationErrors = validateAnimalData(animal, index);
    if (validationErrors.length > 0 && !CONFIG.skipReview) {
      console.log(`   ⚠️  スキップ ${index + 1} (${animal.name}): ${validationErrors.join(', ')}`);
      stats.skipped++;
      return;
    }

    try {
      const displayName = generateDefaultName(animal);

      if (!CONFIG.dryRun) {
        const result = db.upsertTail({
          municipality_id: yamlData.meta.municipality_id,
          external_id: animal.external_id,
          animal_type: animal.animal_type || 'unknown',
          name: displayName,
          breed: animal.breed,
          age_estimate: animal.age_estimate,
          gender: animal.gender || 'unknown',
          color: animal.color,
          size: animal.size,
          health_status: animal.health_status,
          personality: animal.personality,
          special_needs: animal.special_needs,
          images: animal.images,
          protection_date: animal.protection_date,
          deadline_date: animal.deadline_date,
          status: animal.status || 'available',
          source_url: animal.source_url,
        });

        if (result) {
          stats.inserted++;
          console.log(`   ✅ 投入 ${index + 1}: ${displayName} (${animal.gender || 'unknown'})`);
        } else {
          stats.updated++;
          console.log(`   🔄 更新 ${index + 1}: ${displayName} (${animal.gender || 'unknown'})`);
        }
      } else {
        console.log(`   [DRY-RUN] ${index + 1}: ${displayName} (${animal.gender || 'unknown'})`);
        stats.inserted++;
      }
    } catch (error) {
      console.error(`   ❌ エラー ${index + 1} (${animal.name}):`, error.message);
      stats.errors++;
    }
  });

  return stats;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🗄️  YAML → Database 投入処理');
  console.log('='.repeat(60));

  if (CONFIG.dryRun) {
    console.log('📝 DRY-RUN モード: 実際の投入は行いません\n');
  }

  if (CONFIG.skipReview) {
    console.log('⚠️  SKIP-REVIEW モード: レビューフラグを無視します\n');
  }

  try {
    // データベース初期化
    console.log('📊 データベース初期化...');
    const db = initializeDatabase();

    const allStats = {
      files_processed: 0,
      total_animals: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // 各自治体のYAMLファイルを処理
    for (const municipality of CONFIG.municipalities) {
      const yamlDir = path.join(CONFIG.yamlInputDir, municipality);

      if (!fs.existsSync(yamlDir)) {
        console.log(`⚠️  ディレクトリが存在しません: ${yamlDir}`);
        continue;
      }

      const yamlFiles = fs.readdirSync(yamlDir).filter((f) => f.endsWith('.yaml'));
      console.log(`\n📁 ${municipality}: ${yamlFiles.length}個のYAMLファイル`);

      for (const yamlFile of yamlFiles) {
        const yamlPath = path.join(yamlDir, yamlFile);
        const yamlData = loadAndValidateYAML(yamlPath);

        if (!yamlData) {
          console.log(`⏭️  スキップ: ${yamlFile}`);
          continue;
        }

        const stats = importYAMLToDB(yamlData, db, yamlFile);
        allStats.files_processed++;
        allStats.total_animals += stats.total;
        allStats.inserted += stats.inserted;
        allStats.updated += stats.updated;
        allStats.skipped += stats.skipped;
        allStats.errors += stats.errors;
      }
    }

    // 最終統計
    console.log('\n' + '='.repeat(60));
    console.log('📊 投入結果サマリー');
    console.log('='.repeat(60));
    console.log(`ファイル処理数: ${allStats.files_processed}個`);
    console.log(`動物総数: ${allStats.total_animals}匹`);
    console.log(`新規投入: ${allStats.inserted}匹`);
    console.log(`更新: ${allStats.updated}匹`);
    console.log(`スキップ: ${allStats.skipped}匹`);
    console.log(`エラー: ${allStats.errors}匹`);

    if (CONFIG.dryRun) {
      console.log('\n📝 DRY-RUN完了: 実際の投入は行われていません');
    } else {
      console.log('\n✅ データベース投入完了');
    }

    // データベース確認
    if (!CONFIG.dryRun) {
      console.log('\n📊 データベース確認中...');
      const availableTails = db.getAvailableTails();
      console.log(`利用可能な動物: ${availableTails.length}匹`);

      if (availableTails.length > 0) {
        console.log('\n最近追加された動物（最大10匹）:');
        availableTails.slice(0, 10).forEach((tail, index) => {
          console.log(`  ${index + 1}. ${tail.name} (${tail.gender}, ${tail.breed || '品種不明'})`);
        });
      }
    }
  } catch (error) {
    console.error('\n❌ 処理エラー:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// ヘルプメッセージ
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
YAML → Database 投入スクリプト

使用方法:
  node scripts/yaml-to-db.js [オプション]

オプション:
  --dry-run         実際の投入を行わず、処理内容のみ表示
  --skip-review     needs_review フラグを無視して投入
  --help, -h        このヘルプを表示

例:
  # DRY-RUNで確認
  node scripts/yaml-to-db.js --dry-run

  # 実際に投入
  node scripts/yaml-to-db.js

  # レビューフラグを無視して投入
  node scripts/yaml-to-db.js --skip-review
`);
  process.exit(0);
}

// 実行
main();
