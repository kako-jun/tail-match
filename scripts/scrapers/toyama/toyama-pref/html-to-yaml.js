#!/usr/bin/env node

/**
 * 富山県動物管理センター HTML → YAML パーサー
 *
 * HTML構造の特徴:
 * - div.col2L と div.col2R に各猫の情報
 * - img タグに猫の画像
 * - a タグに "No.7002\nアイ（オス）" のような形式
 * - 詳細ページへのリンクがある
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';

import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'toyama/toyama-pref',
  municipalityId: 3, // DBに登録する際に設定（仮）
  htmlDir: 'data/html/toyama/toyama-pref',
  yamlOutputDir: 'data/yaml/toyama/toyama-pref',
  sourceUrl: 'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/cat.html',
};

// ========================================
// HTML解析関数
// ========================================

/**
 * HTMLファイルから猫データを抽出してYAML形式で出力
 */
function extractAnimalsFromHTML(html, sourceUrl, htmlFilename) {
  const $ = load(html);
  const animals = [];

  console.log('🔍 HTML解析開始...');

  // メタデータ
  const extractionMeta = {
    source_file: htmlFilename,
    source_url: sourceUrl,
    extracted_at: getJSTISOString(),
    municipality: CONFIG.municipality,
    municipality_id: CONFIG.municipalityId,
  };

  // 富山県の構造: div.col2L と div.col2R に各猫の情報
  const catContainers = $('div.col2L, div.col2R');
  console.log(`   猫コンテナ発見: ${catContainers.length}個`);

  catContainers.each((index, container) => {
    const $container = $(container);

    try {
      // 画像を取得
      const $img = $container.find('img');
      const imageUrl = $img.attr('src');
      const imageAlt = $img.attr('alt');

      // リンクとテキストを取得
      const $link = $container.find('a');
      const linkHref = $link.attr('href');
      const linkText = $link.text().trim();

      // pタグのテキスト（リンクがない場合）
      const pText = $container.find('p').text().trim();
      const textToAnalyze = linkText || pText;

      // "No.7002\nアイ（オス）" のような形式から情報を抽出
      const lines = textToAnalyze
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      // ID抽出（例: "No.7002" → "7002"）
      let animalId = null;
      let name = null;
      let gender = 'unknown';

      for (const line of lines) {
        // ID抽出
        const idMatch = line.match(/No\.(\d+)/);
        if (idMatch) {
          animalId = idMatch[1];
          continue;
        }

        // 名前と性別抽出（例: "アイ（オス）" or "ゆう（メス）"）
        const nameGenderMatch = line.match(/^(.+?)（(オス|メス)）$/);
        if (nameGenderMatch) {
          name = nameGenderMatch[1];
          const genderText = nameGenderMatch[2];
          gender = genderText === 'オス' ? 'male' : genderText === 'メス' ? 'female' : 'unknown';
          continue;
        }

        // 性別のみ（例: "（オス）"）
        const genderOnlyMatch = line.match(/（(オス|メス)）/);
        if (genderOnlyMatch) {
          const genderText = genderOnlyMatch[1];
          gender = genderText === 'オス' ? 'male' : genderText === 'メス' ? 'female' : 'unknown';
          // 名前はgenderOnlyMatchの前の部分
          name = line.replace(/（(オス|メス)）/, '').trim();
          continue;
        }

        // 上記に該当しない場合は名前として扱う
        if (!name && line.length > 0 && !line.startsWith('No.')) {
          name = line;
        }
      }

      // 画像URLの正規化（相対パスを絶対パスに）
      let normalizedImageUrl = imageUrl;
      if (imageUrl) {
        if (imageUrl.startsWith('/')) {
          normalizedImageUrl = 'https://www.pref.toyama.jp' + imageUrl;
        } else if (imageUrl.startsWith('//')) {
          normalizedImageUrl = 'https:' + imageUrl;
        }
      }

      // 詳細ページURLの正規化
      let normalizedLinkUrl = sourceUrl; // デフォルトは一覧ページ
      if (linkHref) {
        if (linkHref.startsWith('/')) {
          normalizedLinkUrl = 'https://www.pref.toyama.jp' + linkHref;
        } else if (linkHref.startsWith('http')) {
          normalizedLinkUrl = linkHref;
        } else {
          // 相対パス
          normalizedLinkUrl =
            'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/' + linkHref;
        }
      }

      const animal = {
        external_id: animalId || `toyama_${index + 1}`,
        animal_type: 'cat',
        name: name,
        breed: '雑種', // 富山県のページには品種情報がないため
        age_estimate: null, // 一覧ページには年齢情報がない
        gender: gender,
        color: null, // 一覧ページには色情報がない
        size: 'medium', // デフォルト
        health_status: null,
        personality: null,
        special_needs: null,
        images: normalizedImageUrl ? [normalizedImageUrl] : [],
        protection_date: null,
        deadline_date: null,
        status: 'available',
        transfer_decided: false,
        source_url: normalizedLinkUrl,
        confidence_score: name && animalId ? 0.9 : name ? 0.7 : 0.5,
        extraction_method: 'col2_based',
      };

      animals.push(animal);
      console.log(
        `   猫 ${index + 1}: ${animal.name || '名前不明'} (${animal.external_id}, ${animal.gender})`
      );
    } catch (error) {
      console.warn(`   コンテナ ${index + 1} の解析エラー:`, error.message);

      animals.push({
        extraction_error: true,
        error_message: error.message,
        container_index: index + 1,
      });
    }
  });

  return {
    meta: extractionMeta,
    animals: animals,
    statistics: {
      total_containers: catContainers.length,
      valid_animals: animals.filter((a) => !a.extraction_error).length,
      extraction_errors: animals.filter((a) => a.extraction_error).length,
    },
  };
}

// ========================================
// クロスチェック関数
// ========================================

/**
 * 抽出結果の整合性をチェック
 */
function crossCheckData(data, html) {
  const $ = load(html);
  const warnings = [];

  // 性別の言及回数をカウント
  const maleCount = (html.match(/オス/g) || []).length;
  const femaleCount = (html.match(/メス/g) || []).length;

  const extractedMale = data.animals.filter((a) => a.gender === 'male').length;
  const extractedFemale = data.animals.filter((a) => a.gender === 'female').length;

  if (Math.abs(maleCount - extractedMale) > 2) {
    warnings.push(`オス表記(${maleCount})が抽出数(${extractedMale})と大きく異なる - 確認が必要`);
  }

  if (Math.abs(femaleCount - extractedFemale) > 2) {
    warnings.push(
      `メス表記(${femaleCount})が抽出数(${extractedFemale})と大きく異なる - 確認が必要`
    );
  }

  // 画像タグ数のチェック
  const imgTags = $('div.col2L img, div.col2R img').length;
  const extractedImages = data.animals.filter((a) => a.images && a.images.length > 0).length;

  if (imgTags !== extractedImages) {
    warnings.push(`画像タグ数(${imgTags})と抽出画像数(${extractedImages})が一致しない`);
  }

  return {
    gender_mentions: { male: maleCount, female: femaleCount },
    image_tags: imgTags,
    container_count: data.statistics.total_containers,
    warnings: warnings,
  };
}

// ========================================
// 信頼度判定
// ========================================

/**
 * 全体的な信頼度レベルを判定
 */
function determineConfidenceLevel(data, crossCheck) {
  const { valid_animals, extraction_errors } = data.statistics;
  const { warnings } = crossCheck;

  if (extraction_errors > 0) {
    return 'critical'; // エラーがある場合は要確認
  }

  if (warnings.length > 2) {
    return 'low'; // 警告が多い
  }

  if (warnings.length > 0) {
    return 'medium'; // 軽微な警告
  }

  if (valid_animals > 0) {
    return 'high'; // 問題なし
  }

  return 'low';
}

// ========================================
// メイン処理
// ========================================

function main() {
  console.log('='.repeat(60));
  console.log('🐱 富山県動物管理センター - HTML → YAML 変換');
  console.log('='.repeat(60));

  try {
    // Step 1: 最新HTMLファイルを取得
    const htmlFiles = fs
      .readdirSync(CONFIG.htmlDir)
      .filter((f) => f.endsWith('_tail.html'))
      .sort()
      .reverse();

    if (htmlFiles.length === 0) {
      throw new Error(`HTMLファイルが見つかりません: ${CONFIG.htmlDir}`);
    }

    const latestHtmlFile = htmlFiles[0];
    const htmlPath = path.join(CONFIG.htmlDir, latestHtmlFile);

    console.log(`📄 対象HTMLファイル: ${latestHtmlFile}`);
    console.log(`📂 出力先: ${CONFIG.yamlOutputDir}\n`);

    // Step 2: HTML読み込み
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Step 3: データ抽出
    const extractedData = extractAnimalsFromHTML(html, CONFIG.sourceUrl, latestHtmlFile);

    // Step 4: クロスチェック
    console.log('\n🔍 クロスチェック実行中...');
    const crossCheckResult = crossCheckData(extractedData, html);

    // Step 5: 信頼度判定
    const confidenceLevel = determineConfidenceLevel(extractedData, crossCheckResult);

    // Step 6: YAML出力データ作成
    const yamlData = {
      meta: extractedData.meta,
      animals: extractedData.animals,
      statistics: extractedData.statistics,
      cross_check: crossCheckResult,
      consistency_warnings: crossCheckResult.warnings,
      confidence_level: confidenceLevel,
    };

    // Step 7: YAML保存
    fs.mkdirSync(CONFIG.yamlOutputDir, { recursive: true });

    const timestamp = latestHtmlFile.match(/(\d{8}_\d{6})/)[1];
    const yamlFilename = `${timestamp}_tail.yaml`;
    const yamlPath = path.join(CONFIG.yamlOutputDir, yamlFilename);

    fs.writeFileSync(yamlPath, yaml.dump(yamlData, { lineWidth: -1, noRefs: true }), 'utf-8');

    // 結果表示
    console.log('\n' + '='.repeat(60));
    console.log('📊 抽出結果サマリー');
    console.log('='.repeat(60));
    console.log(`総コンテナ数: ${extractedData.statistics.total_containers}個`);
    console.log(`有効な猫: ${extractedData.statistics.valid_animals}匹`);
    console.log(`抽出エラー: ${extractedData.statistics.extraction_errors}件`);
    console.log(`警告: ${crossCheckResult.warnings.length}件`);
    console.log(`信頼度レベル: ${confidenceLevel.toUpperCase()}`);

    if (crossCheckResult.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      crossCheckResult.warnings.forEach((w) => console.log(`   - ${w}`));
    }

    console.log(`\n✅ YAML保存: ${yamlPath}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
