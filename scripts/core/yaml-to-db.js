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
import { initializeDatabase, closeDatabase } from '../lib/db.js';
import { createLogger } from '../lib/history-logger.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  yamlInputDir: 'data/yaml',
  municipalities: [
    // 混在ページ（サフィックスなし）
    'ishikawa/aigo-ishikawa',
    'hokkaido/hokkaido-pref',
    'hyogo/kobe-city',
    'okinawa/naha-city',
    // 猫専用ページ（-cats サフィックス）
    'ishikawa/kanazawa-city-cats',
    'toyama/toyama-pref-cats',
    'fukui/fukui-pref-cats',
    'kyoto/kyoto-pref-cats',
    'osaka/osaka-pref-cats',
    'osaka/osaka-city-cats',
    'osaka/sakai-city-cats',
    'hyogo/hyogo-pref-cats',
    'tokyo/tokyo-metro-cats',
    'kanagawa/kanagawa-pref-cats',
    'kanagawa/yokohama-city-cats',
    'saitama/saitama-pref-cats',
    'saitama/saitama-city-cats',
    'chiba/chiba-pref-cats',
    'chiba/chiba-city-cats',
    'hokkaido/sapporo-city-cats',
    'okinawa/okinawa-pref-cats',
    'niigata/niigata-city-cats',
    'niigata/niigata-pref-cats',
    // 犬専用ページ（-dogs サフィックス）
    'niigata/niigata-city-dogs',
    'niigata/niigata-pref-dogs',
    'toyama/toyama-pref-dogs',
    'fukui/fukui-pref-dogs',
    'kyoto/kyoto-pref-dogs',
    'kanagawa/kanagawa-pref-dogs',
    'chiba/chiba-pref-dogs',
    'chiba/chiba-city-dogs',
    'okinawa/okinawa-pref-dogs',
  ], // 複数自治体対応（猫・犬・混在）
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
    errors.push(`[動物${index + 1}] external_id が未設定`);
  }

  // needs_review フラグのチェック
  if (animal.needs_review && !CONFIG.skipReview) {
    errors.push(`レビューが必要とマークされています`);
  }

  return errors;
}

/**
 * 名前がない場合にデフォルト名を生成（external_idをそのまま使用）
 */
function generateDefaultName(animal) {
  if (!animal.name || animal.name.includes('保護動物')) {
    // 動物種別に応じた名前を生成
    let prefix = '保護動物';
    if (animal.animal_type === 'cat') {
      prefix = '保護猫';
    } else if (animal.animal_type === 'dog') {
      prefix = '保護犬';
    }

    // external_idをそのまま使って一意性を保証
    return `${prefix}${animal.external_id}`;
  }
  return animal.name;
}

// ========================================
// 画像の正規化
// ========================================

/**
 * 画像データを string[] (URL のみ) に正規化する。
 * スクレイパーによって {url, alt, original_src}[] または string[] が混在するため、
 * DB 投入前に統一する。
 */
function normalizeImages(images) {
  if (!images || !Array.isArray(images)) return [];
  return images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean);
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
      const baseName = generateDefaultName(animal);
      const displayName = db.ensureUniqueName(yamlData.meta.municipality_id, baseName);

      if (!CONFIG.dryRun) {
        const { isNew } = db.upsertTail({
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
          images: normalizeImages(animal.images),
          protection_date: animal.protection_date,
          deadline_date: animal.deadline_date,
          status: animal.status || 'available',
          source_url: animal.source_url,
          listing_type: animal.listing_type || 'adoption', // 迷子猫 or 譲渡猫
        });

        if (isNew) {
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
      // 各自治体ごとにロガーを作成
      const logger = createLogger(municipality);
      logger.start();
      logger.loadPreviousCounts(); // scrape.js と html-to-yaml.js のカウントを継承

      try {
        const yamlDir = path.join(CONFIG.yamlInputDir, municipality);

        if (!fs.existsSync(yamlDir)) {
          console.log(`⚠️  ディレクトリが存在しません: ${yamlDir}`);
          logger.finalize();
          continue;
        }

        const allYamlFiles = fs.readdirSync(yamlDir).filter((f) => f.endsWith('.yaml'));

        // 最新のYAMLファイルのみ使用（古いファイルはゾンビの原因になる）
        allYamlFiles.sort().reverse();
        const yamlFiles = allYamlFiles.length > 0 ? [allYamlFiles[0]] : [];
        console.log(`\n📁 ${municipality}: 最新1件を使用 (全${allYamlFiles.length}件中)`);

        let municipalityTotalInserted = 0;
        let municipalityTotalYAML = 0; // YAMLファイル内の動物数合計

        for (const yamlFile of yamlFiles) {
          const yamlPath = path.join(yamlDir, yamlFile);
          const yamlData = loadAndValidateYAML(yamlPath);

          if (!yamlData) {
            console.log(`⏭️  スキップ: ${yamlFile}`);
            continue;
          }

          // YAMLファイル内の動物数をカウント
          const yamlAnimals = yamlData.animals || [];
          municipalityTotalYAML += yamlAnimals.length;

          const stats = importYAMLToDB(yamlData, db, yamlFile);
          allStats.files_processed++;
          allStats.total_animals += stats.total;
          allStats.inserted += stats.inserted;
          allStats.updated += stats.updated;
          allStats.skipped += stats.skipped;
          allStats.errors += stats.errors;

          // この自治体の投入数を集計
          municipalityTotalInserted += stats.inserted + stats.updated;
        }

        // YAML抽出後の動物数を記録（YAML→DBの不一致を検出）
        logger.logYAMLCount(municipalityTotalYAML);

        // DB投入後の動物数を記録（1匹でも減少したら自動警告）
        logger.logDBCount(municipalityTotalInserted);

        // 最終的にfinalize()を呼んでshelters-history.yamlを更新
        logger.finalize();
      } catch (error) {
        // エラー時もロガーに記録
        logger.logError(error);
        logger.finalize();
        throw error; // エラーは上位に伝播
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
