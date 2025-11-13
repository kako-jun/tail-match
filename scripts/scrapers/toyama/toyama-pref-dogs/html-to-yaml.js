#!/usr/bin/env node

/**
 * 富山県動物管理センター（犬） HTML → YAML パーサー
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
  municipality: 'toyama/toyama-pref-dogs',
  municipalityId: 3, // 富山県動物管理センター
  sourceUrl: 'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/dog.html',
};

// ========================================
// HTML解析関数
// ========================================

function extractAnimalsFromHTML(html, sourceUrl, htmlFilename) {
  const $ = load(html);
  const animals = [];

  console.log('🔍 HTML解析開始...');

  const extractionMeta = {
    source_file: htmlFilename,
    source_url: sourceUrl,
    extracted_at: getJSTISOString(),
    municipality: CONFIG.municipality,
    municipality_id: CONFIG.municipalityId,
  };

  const dogContainers = $('div.col2L, div.col2R');
  console.log(`   犬コンテナ発見: ${dogContainers.length}個`);

  dogContainers.each((index, container) => {
    const $container = $(container);

    try {
      const $img = $container.find('img');
      const imageUrl = $img.attr('src');

      const $link = $container.find('a');
      const linkHref = $link.attr('href');
      const linkText = $link.text().trim();

      const pText = $container.find('p').text().trim();
      const textToAnalyze = linkText || pText;

      const lines = textToAnalyze
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      let animalId = null;
      let name = null;
      let gender = 'unknown';

      for (const line of lines) {
        const idMatch = line.match(/No\.(\d+)/);
        if (idMatch) {
          animalId = idMatch[1];
          continue;
        }

        const nameGenderMatch = line.match(/^(.+?)（(オス|メス)）$/);
        if (nameGenderMatch) {
          name = nameGenderMatch[1];
          const genderText = nameGenderMatch[2];
          gender = genderText === 'オス' ? 'male' : genderText === 'メス' ? 'female' : 'unknown';
          continue;
        }

        const genderOnlyMatch = line.match(/（(オス|メス)）/);
        if (genderOnlyMatch) {
          const genderText = genderOnlyMatch[1];
          gender = genderText === 'オス' ? 'male' : genderText === 'メス' ? 'female' : 'unknown';
          name = line.replace(/（(オス|メス)）/, '').trim();
          continue;
        }

        if (!name && line.length > 0 && !line.startsWith('No.')) {
          name = line;
        }
      }

      let normalizedImageUrl = imageUrl;
      if (imageUrl) {
        if (imageUrl.startsWith('/')) {
          normalizedImageUrl = 'https://www.pref.toyama.jp' + imageUrl;
        } else if (imageUrl.startsWith('//')) {
          normalizedImageUrl = 'https:' + imageUrl;
        }
      }

      let normalizedLinkUrl = sourceUrl;
      if (linkHref) {
        if (linkHref.startsWith('/')) {
          normalizedLinkUrl = 'https://www.pref.toyama.jp' + linkHref;
        } else if (linkHref.startsWith('http')) {
          normalizedLinkUrl = linkHref;
        } else {
          normalizedLinkUrl =
            'https://www.pref.toyama.jp/1207/kurashi/seikatsu/seikatsu/doubutsuaigo/' + linkHref;
        }
      }

      const animal = {
        external_id: animalId || `toyama-dog-${index + 1}`,
        animal_type: 'dog',
        name: name,
        breed: '雑種',
        age_estimate: null,
        gender: gender,
        color: null,
        size: 'medium',
        health_status: null,
        personality: null,
        special_needs: null,
        images: normalizedImageUrl ? [normalizedImageUrl] : [],
        protection_date: null,
        deadline_date: null,
        status:
          textToAnalyze.includes('譲渡済み') ||
          textToAnalyze.includes('譲渡しました') ||
          textToAnalyze.includes('譲渡決定')
            ? 'adopted'
            : 'available',
        transfer_decided: false,
        source_url: normalizedLinkUrl,
        confidence_score: name && animalId ? 0.9 : name ? 0.7 : 0.5,
        extraction_method: 'col2_based',
      };

      animals.push(animal);
      console.log(
        `   犬 ${index + 1}: ${animal.name || '名前不明'} (${animal.external_id}, ${animal.gender})`
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
      total_containers: dogContainers.length,
      valid_animals: animals.filter((a) => !a.extraction_error).length,
      extraction_errors: animals.filter((a) => a.extraction_error).length,
    },
  };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 富山県動物管理センター（犬） - YAML抽出');
  console.log('='.repeat(60));
  console.log(`   Municipality: ${CONFIG.municipality}`);
  console.log('='.repeat(60) + '\n');

  try {
    const htmlDir = path.join(
      process.cwd(),
      'data',
      'html',
      CONFIG.municipality.replace('/', path.sep)
    );

    if (!fs.existsSync(htmlDir)) {
      throw new Error(`HTMLディレクトリが見つかりません: ${htmlDir}`);
    }

    const files = fs
      .readdirSync(htmlDir)
      .filter((f) => f.endsWith('_tail.html'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('HTMLファイルが見つかりません');
    }

    const htmlFile = path.join(htmlDir, files[0]);
    console.log(`📄 HTMLファイル: ${htmlFile}\n`);

    const html = fs.readFileSync(htmlFile, 'utf-8');

    const data = extractAnimalsFromHTML(html, CONFIG.sourceUrl, files[0]);

    console.log(`\n📊 抽出結果:`);
    console.log(`   総コンテナ数: ${data.statistics.total_containers}`);
    console.log(`   有効な犬: ${data.statistics.valid_animals}`);
    console.log(`   抽出エラー: ${data.statistics.extraction_errors}`);

    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_tail.yaml`);

    data.meta.total_count = data.statistics.valid_animals;

    const yamlContent = yaml.dump(data, { indent: 2, lineWidth: -1 });

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
