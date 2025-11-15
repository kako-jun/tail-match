#!/usr/bin/env node

/**
 * 徳島県動物愛護管理センター（猫） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'tokushima/tokushima-pref-cats',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://douai-tokushima.com',
  source_url: 'https://douai-tokushima.com/animalinfo/list4_2',
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
 * 全角数字を半角に変換
 */
function toHalfWidth(str) {
  if (!str) return str;
  return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
}

/**
 * リストから猫情報を抽出
 * HTMLパターン: <ul class="news">内の<table class="f_a3">
 */
function extractCatInfoFromList($) {
  const cats = [];

  // ul.news内のテーブルを検索
  $('ul.news table.f_a3').each((index, table) => {
    const $table = $(table);

    // 番号を取得
    let managementNumber = '';
    let statusText = '';
    let transferDate = '';
    let birthEstimate = '';
    let gender = 'unknown';
    let personality = '';
    let otherInfo = '';

    // テーブルの各行を解析
    const rows = $table.find('tr').toArray();
    for (let i = 0; i < rows.length; i++) {
      const $row = $(rows[i]);
      const $th = $row.find('th');
      const $td = $row.find('td');

      // th行の場合、次の行のtdを確認（rowspan考慮）
      if ($th.length > 0) {
        const label = $th.eq(0).text().trim();

        // 次の行がtdの場合
        if (i + 1 < rows.length) {
          const $nextRow = $(rows[i + 1]);
          const $nextTh = $nextRow.find('th');

          // 次の行にthがない場合
          if ($nextTh.length === 0) {
            const $nextTd = $nextRow.find('td');
            // .photoクラスを持つtdを除外して最後のtdを取得
            const $targetTd = $nextTd.not('.photo').last();

            if ($targetTd.length > 0) {
              let value = $targetTd.text().trim();
              value = toHalfWidth(value); // 全角→半角変換

              if (label.includes('番号')) {
                managementNumber = value;
              } else if (label.includes('譲渡状況')) {
                statusText = value;
              } else if (label.includes('譲渡可能日')) {
                transferDate = value;
              }
            }
          }
        }

        // その他の情報（colspan="2"）
        if ($th.attr('colspan') === '2' && label.includes('その他の情報')) {
          if (i + 1 < rows.length) {
            const $nextRow = $(rows[i + 1]);
            let info = $nextRow.find('td').text().trim();
            info = toHalfWidth(info);
            otherInfo = info;
          }
        }
      }

      // th 2列 + 次の行がtd 2列の場合（推定生年月日/性別など）
      if ($th.length === 2 && $td.length === 0) {
        const label1 = $th.eq(0).text().trim();
        const label2 = $th.eq(1).text().trim();

        if (i + 1 < rows.length) {
          const $nextRow = $(rows[i + 1]);
          const $nextTd = $nextRow.find('td');

          if ($nextTd.length === 2 && $nextRow.find('th').length === 0) {
            let value1 = $nextTd.eq(0).text().trim();
            let value2 = $nextTd.eq(1).text().trim();

            value1 = toHalfWidth(value1); // 全角→半角変換
            value2 = toHalfWidth(value2);

            if (label1.includes('推定生年月日')) {
              birthEstimate = value1;
            }

            if (label2.includes('性別')) {
              if (value2.includes('オス') || value2.includes('雄')) {
                gender = 'male';
              } else if (value2.includes('メス') || value2.includes('雌')) {
                gender = 'female';
              }
            }

            // 性格評価を収集
            if (
              label1.includes('愛嬌') ||
              label1.includes('やんちゃ') ||
              label1.includes('慎重') ||
              label1.includes('人懐')
            ) {
              personality += `${label1}: ${value1}, ${label2}: ${value2}\n`;
            }
          }
        }
      }
    }

    // 画像URLを取得
    const images = [];
    $table.find('.photo a').each((i, imgLink) => {
      const imgHref = $(imgLink).attr('href');
      if (imgHref) {
        // 相対パスを絶対URLに変換
        const fullUrl = imgHref.startsWith('http')
          ? imgHref
          : CONFIG.base_url + (imgHref.startsWith('/') ? imgHref : '/' + imgHref);
        images.push(fullUrl);
      }
    });

    // external_id生成（番号から）
    const external_id = `tokushima-pref-${managementNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    // status判定
    const status = getAdoptionStatus(statusText);

    // 猫情報を追加
    const catInfo = {
      external_id,
      municipality_id: CONFIG.municipalityId,
      name: managementNumber, // 名前がない場合は番号を使用
      gender,
      age_estimate: '', // 徳島県は推定年齢ではなく推定生年月日を提供
      birth_estimate: birthEstimate,
      description: otherInfo || personality,
      status,
      source_url: CONFIG.source_url,
      images: images.slice(0, 5), // 最大5枚
      scraped_at: getJSTISOString(),
    };

    cats.push(catInfo);
  });

  return cats;
}

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐱 徳島県動物愛護管理センター - YAML抽出（猫）');
  console.log('='.repeat(60) + '\n');

  try {
    // 最新HTMLファイルを取得
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 読み込み: ${htmlPath}`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // 猫情報を抽出
    console.log('🔍 猫情報を抽出中...');
    const cats = extractCatInfoFromList($);

    console.log(`✅ ${cats.length}匹の猫情報を抽出しました`);
    logger.logYAMLCount(cats.length);

    // YAML出力ディレクトリ作成
    const yamlDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );
    fs.mkdirSync(yamlDir, { recursive: true });

    // YAMLファイル名生成
    const timestamp = getJSTTimestamp();
    const filename = `${timestamp}_cats.yaml`;
    const filepath = path.join(yamlDir, filename);

    // YAML保存
    const yamlContent = yaml.dump(cats, { indent: 2, lineWidth: -1 });
    fs.writeFileSync(filepath, yamlContent, 'utf-8');
    console.log(`💾 YAML保存: ${filepath}\n`);

    // 詳細表示
    console.log('詳細:');
    cats.forEach((cat, i) => {
      console.log(
        `  ${i + 1}. ${cat.name} (${cat.gender}, 生年月日: ${cat.birth_estimate || 'unknown'}, status: ${cat.status})`
      );
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ YAML抽出完了');
    console.log('='.repeat(60));
  } catch (error) {
    logger.logError(error);
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    logger.finalize();
  }
}

main();
