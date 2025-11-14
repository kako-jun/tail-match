#!/usr/bin/env node

/**
 * 北九州市動物愛護センター（猫） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'fukuoka/kitakyushu-city-cats',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.city.kitakyushu.lg.jp',
  source_url: 'https://www.city.kitakyushu.lg.jp/contents/924_11835.html',
};

function getLatestHtmlFile() {
  const htmlDir = path.join(
    process.cwd(),
    'data',
    'html',
    CONFIG.municipality.replace('/', path.sep)
  );
  const files = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('_tail.html'))
    .sort()
    .reverse();
  return path.join(htmlDir, files[0]);
}

/**
 * テーブルから猫情報を抽出
 */
function extractCatInfoFromTable($, $table, sectionName) {
  const cats = [];

  $table.find('tbody > tr').each((rowIndex, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find('td');

    // ヘッダー行（<th>を含む）をスキップ
    if ($tr.find('th').length > 0) return;

    // 成猫（8列）と子猫（6列）の判定
    const isAdultCat = $tds.length >= 7;
    const isKitten = $tds.length === 6;

    if (!isAdultCat && !isKitten) {
      // 不明な形式の行はスキップ
      return;
    }

    // 列を抽出（成猫と子猫で列数が異なる）
    const $numberCell = $tds.eq(0);
    const numberCellText = $numberCell.text().trim();
    const genderText = $tds.eq(1).text().trim();
    const color = $tds.eq(2).text().trim();
    const birthEstimate = $tds.eq(3).text().trim();

    let felvStatus = null;
    let fivStatus = null;
    let notes = null;
    let photoIndex = null;

    if (isAdultCat) {
      // 成猫: 8列（番号、性別、毛色、推定生年、FeLV、FIV、備考、写真）
      felvStatus = $tds.eq(4).text().trim();
      fivStatus = $tds.eq(5).text().trim();
      notes = $tds.eq(6).text().trim();
      photoIndex = 7;
    } else {
      // 子猫: 6列（番号、性別、毛色、推定生年月、備考、写真）
      notes = $tds.eq(4).text().trim();
      photoIndex = 5;
    }

    // 写真リンク（複数あることがある）
    const images = [];
    $tds
      .eq(photoIndex)
      .find('a')
      .each((i, a) => {
        const href = $(a).attr('href');
        if (href) {
          images.push(href.startsWith('http') ? href : CONFIG.base_url + href);
        }
      });

    // 番号と愛称を分離
    // HTMLは <p>NEW!</p><p>B25004<br>(はな)</p> のような構造
    // テキストは "NEW！ B25004 (はな)" のようになる
    // "NEW！"などを除去して、番号と愛称を抽出
    let managementNumber = null;
    let name = null;

    // B + 数字のパターンを抽出
    const numberMatch = numberCellText.match(/([A-Z]\d{5})/);
    if (numberMatch) {
      managementNumber = numberMatch[1];
    }

    // 括弧内の愛称を抽出（全角・半角両対応）
    const nameMatch = numberCellText.match(/[（(](.+?)[）)]/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    // 管理番号が抽出できない場合はスキップ
    if (!managementNumber) {
      console.log(`  ⚠️  スキップ: 管理番号が見つかりません (${numberCellText})`);
      return;
    }

    const external_id = `kitakyushu-city-${managementNumber}`;

    // 性別判定
    let gender = 'unknown';
    if (genderText.includes('オス') || genderText.includes('雄')) {
      gender = 'male';
    } else if (genderText.includes('メス') || genderText.includes('雌')) {
      gender = 'female';
    }

    // 健康状態（FeLV/FIV検査結果）
    let health_status = [];
    if (felvStatus) {
      health_status.push(`猫白血病: ${felvStatus}`);
    }
    if (fivStatus) {
      health_status.push(`猫エイズ: ${fivStatus}`);
    }

    // 譲渡済み判定
    const fullText = `${numberCellText} ${notes}`;
    const status = getAdoptionStatus(fullText);

    const cat = {
      external_id,
      name,
      animal_type: 'cat',
      breed: null,
      age_estimate: birthEstimate || null,
      gender,
      color: color || null,
      size: null,
      health_status: health_status.length > 0 ? health_status.join('、') : null,
      personality: null,
      special_needs: notes || null,
      images,
      protection_date: null,
      deadline_date: null,
      status,
      source_url: CONFIG.source_url,
      confidence_level: 'high',
      extraction_notes: [sectionName],
      listing_type: 'adoption',
    };

    cats.push(cat);

    console.log(`--- ${sectionName} ${cats.length} ---`);
    console.log(`   番号: ${managementNumber}`);
    console.log(`   愛称: ${name || '不明'}`);
    console.log(`   性別: ${gender}`);
    console.log(`   毛色: ${color || '不明'}`);
    console.log(`   推定生年: ${birthEstimate || '不明'}`);
  });

  return cats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐱 北九州市動物愛護センター（猫） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allCats = [];

    // 全てのテーブルを走査
    $('table').each((tableIndex, table) => {
      const $table = $(table);

      // 前のテキストでセクション名を判定
      const prevText = $table.prev().text() + $table.prevAll('h3').first().text();

      let sectionName = '譲渡対象猫';
      if (prevText.includes('成猫')) {
        sectionName = '成猫';
      } else if (prevText.includes('子猫')) {
        sectionName = '子猫';
      }

      const cats = extractCatInfoFromTable($, $table, sectionName);
      allCats.push(...cats);
    });

    console.log(`\n📊 合計抽出数: ${allCats.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allCats.length);

    const outputDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = getJSTTimestamp();
    const outputFile = path.join(outputDir, `${timestamp}_tail.yaml`);

    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: path.basename(htmlFile),
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          municipality_id: CONFIG.municipalityId,
          total_count: allCats.length,
          note: '成猫・子猫の譲渡候補情報（検査結果付き）',
        },
        animals: allCats,
      },
      { indent: 2, lineWidth: -1 }
    );

    fs.writeFileSync(outputFile, yamlContent, 'utf-8');

    console.log(`\n✅ YAML出力完了: ${outputFile}`);
    console.log(`📊 ファイルサイズ: ${fs.statSync(outputFile).size} bytes\n`);

    logger.finalize(); // 履歴を保存

    console.log('='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    logger.finalize(); // エラー時も履歴を保存
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
