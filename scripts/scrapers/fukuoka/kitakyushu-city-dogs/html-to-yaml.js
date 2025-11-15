#!/usr/bin/env node

/**
 * 北九州市動物愛護センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'fukuoka/kitakyushu-city-dogs',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://www.city.kitakyushu.lg.jp',
  source_url: 'https://www.city.kitakyushu.lg.jp/contents/924_11834.html',
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
 * テーブルから犬情報を抽出
 */
function extractDogInfoFromTable($, $table, sectionName) {
  const dogs = [];

  $table.find('tbody > tr').each((rowIndex, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find('td');

    // ヘッダー行（<th>を含む）をスキップ
    if ($tr.find('th').length > 0) return;

    // 成犬（8列）、子犬（6列）、rowspan影響下の子犬（3列）の判定
    const isAdultDog = $tds.length >= 7;
    const isPuppy = $tds.length === 6;
    const isPuppyRowspan = $tds.length === 3; // rowspanで推定生年月・備考・写真列が省略された行

    if (!isAdultDog && !isPuppy && !isPuppyRowspan) {
      // 不明な形式の行はスキップ
      return;
    }

    // 列を抽出（成犬と子犬で列数が異なる）
    const $numberCell = $tds.eq(0);
    const numberCellText = $numberCell.text().trim();

    let breed = null;
    let genderText = null;
    let color = null;
    let birthEstimate = null;
    let filariaStatus = null;
    let notes = null;
    let photoIndex = null;

    if (isAdultDog) {
      // 成犬: 8列（番号（愛称）、種類、性別、毛色、推定生年、フィラリア検査、備考、写真）
      breed = $tds.eq(1).text().trim();
      genderText = $tds.eq(2).text().trim();
      color = $tds.eq(3).text().trim();
      birthEstimate = $tds.eq(4).text().trim();
      filariaStatus = $tds.eq(5).text().trim();
      notes = $tds.eq(6).text().trim();
      photoIndex = 7;
    } else if (isPuppy) {
      // 子犬: 6列（番号、性別、毛色、推定生年月、概要、写真）
      genderText = $tds.eq(1).text().trim();
      color = $tds.eq(2).text().trim();
      birthEstimate = $tds.eq(3).text().trim();
      notes = $tds.eq(4).text().trim();
      photoIndex = 5;
    } else if (isPuppyRowspan) {
      // rowspan影響下の子犬: 3列（番号、性別、毛色）のみ
      // 推定生年月・備考・写真は前の行と共通なので省略されている
      genderText = $tds.eq(1).text().trim();
      color = $tds.eq(2).text().trim();
      birthEstimate = null; // rowspanされた情報は取得しない（前の行と同じなので）
      notes = '同胎の子犬';
      photoIndex = null; // 写真なし
    }

    // 写真リンク（複数あることがある）
    const images = [];
    if (photoIndex !== null) {
      $tds
        .eq(photoIndex)
        .find('a')
        .each((i, a) => {
          const href = $(a).attr('href');
          if (href) {
            images.push(href.startsWith('http') ? href : CONFIG.base_url + href);
          }
        });
    }

    // 番号と愛称を分離
    // 成犬HTMLは <p>A24135<br>（アポロ）</p> のような構造
    // 子犬HTMLは単に "A25101" のような構造
    let managementNumber = null;
    let name = null;

    // A + 5桁数字のパターンを抽出
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

    // 性別判定（去勢・不妊情報も含む）
    let gender = 'unknown';
    if (genderText.includes('オス') || genderText.includes('雄')) {
      gender = 'male';
    } else if (genderText.includes('メス') || genderText.includes('雌')) {
      gender = 'female';
    }

    // 健康状態（フィラリア検査結果）
    let health_status = null;
    if (filariaStatus) {
      health_status = `フィラリア: ${filariaStatus}`;
    }

    // 譲渡済み判定
    const fullText = `${numberCellText} ${notes}`;
    const status = getAdoptionStatus(fullText);

    const dog = {
      external_id,
      name,
      animal_type: 'dog',
      breed: breed || null,
      age_estimate: birthEstimate || null,
      gender,
      color: color || null,
      size: null,
      health_status,
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

    dogs.push(dog);

    console.log(`--- ${sectionName} ${dogs.length} ---`);
    console.log(`   番号: ${managementNumber}`);
    console.log(`   愛称: ${name || '不明'}`);
    console.log(`   種類: ${breed || '不明'}`);
    console.log(`   性別: ${genderText || '不明'}`);
    console.log(`   毛色: ${color || '不明'}`);
    console.log(`   推定生年: ${birthEstimate || '不明'}`);
    if (filariaStatus) {
      console.log(`   フィラリア: ${filariaStatus}`);
    }
    console.log(`   ステータス: ${status} (${notes?.substring(0, 30) || '募集中'})`);
  });

  return dogs;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐕 北九州市動物愛護センター（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts(); // scrape.jsのhtml_countを継承

  try {
    const htmlFile = getLatestHtmlFile();
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = load(html);

    const allDogs = [];

    // 全てのテーブルを走査
    $('table').each((tableIndex, table) => {
      const $table = $(table);

      // captionまたは前のテキストでセクション名を判定
      const caption = $table.find('caption').text();
      const prevText = $table.prev().text() + $table.prevAll('h3, h4').first().text();

      let sectionName = '譲渡対象犬';
      if (caption.includes('子犬') || prevText.includes('子犬')) {
        sectionName = '子犬';
      } else if (caption.includes('成犬') || prevText.includes('成犬')) {
        sectionName = '成犬';
      }

      // 譲渡対象のテーブルのみ処理（飼育数テーブルなどをスキップ）
      if (!caption.includes('譲渡対象') && !caption.includes('一覧')) {
        return;
      }

      const dogs = extractDogInfoFromTable($, $table, sectionName);
      allDogs.push(...dogs);
    });

    console.log(`\n📊 合計抽出数: ${allDogs.length}匹`);

    // YAML抽出後の動物数を記録（⚠️ 1匹でも減少したら自動警告）
    logger.logYAMLCount(allDogs.length);

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
          total_count: allDogs.length,
          note: '子犬・成犬の譲渡候補情報（フィラリア検査結果付き）',
        },
        animals: allDogs,
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
