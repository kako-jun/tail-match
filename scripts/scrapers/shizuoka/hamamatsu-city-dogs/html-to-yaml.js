#!/usr/bin/env node

/**
 * 浜松市動物愛護教育センター（犬） YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'shizuoka/hamamatsu-city-dogs',
  base_url: 'https://www.hama-aikyou.jp',
  source_url: 'https://www.hama-aikyou.jp/jouto/yuzuriuke/',
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

function extractAnimalInfo(detailHtml, detailUrl) {
  const $ = load(detailHtml);

  // 名前を抽出（h1タグ）
  let name = $('h1').first().text().trim();

  // h1タグで名前が取得できない場合、breadcrumbのspanから取得
  if (!name) {
    name = $('.bread-area span').last().text().trim();
  }

  if (!name) {
    return null;
  }

  const external_id = `hamamatsu-city-${name.toLowerCase().replace(/\s+/g, '-')}`;

  // テーブルから詳細情報を抽出
  let breed = null;
  let gender = 'unknown';
  let age_estimate = null;
  let size = null;
  let weight = null;

  $('table tr').each((i, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find('td');
    if ($tds.length >= 2) {
      const key = $tds.eq(0).text().trim();
      const value = $tds.eq(1).text().trim();

      if (key.includes('犬　種') || key.includes('犬種')) {
        breed = value;
      } else if (key.includes('性　別') || key.includes('性別')) {
        if (value.includes('オス') || value.includes('雄')) {
          gender = 'male';
        } else if (value.includes('メス') || value.includes('雌')) {
          gender = 'female';
        }
      } else if (key.includes('年　齢') || key.includes('年齢')) {
        age_estimate = value;
      } else if (key.includes('体　格') || key.includes('体格')) {
        size = value;
      } else if (key.includes('体　重') || key.includes('体重')) {
        weight = value;
      }
    }
  });

  // 体重がある場合、sizeに追加
  if (weight) {
    size = size ? `${size}（${weight}）` : weight;
  }

  // 特記事項を抽出（テーブルの後のテキスト）
  let special_notes = null;
  $('table').each((i, table) => {
    const $table = $(table);
    // テーブルの後の要素から「特記事項」を探す
    let nextElem = $table.next();
    while (nextElem.length) {
      const text = nextElem.text().trim();
      if (text.includes('特記事項')) {
        special_notes = text.replace(/^.*特記事項[：:\s]*/, '').trim();
        break;
      }
      nextElem = nextElem.next();
    }
  });

  // 画像を抽出
  const images = [];
  $('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src && !src.includes('logo') && !src.includes('banner')) {
      const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
      images.push(fullUrl);
    }
  });

  // ステータスは常に'available'（譲渡対象のみ掲載）
  const status = 'available';

  return {
    external_id,
    name,
    animal_type: 'dog',
    breed,
    age_estimate,
    gender,
    color: null,
    size,
    health_status: null,
    personality: null,
    special_needs: special_notes,
    images,
    protection_date: null,
    deadline_date: null,
    status,
    source_url: detailUrl || CONFIG.source_url,
    confidence_level: 'high',
    extraction_notes: ['譲渡対象'],
    listing_type: 'adoption',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🐶 浜松市動物愛護教育センター（犬） - YAML抽出');
  console.log('='.repeat(60) + '\n');

  const logger = createLogger(CONFIG.municipality);
  logger.start();
  const previousCounts = logger.loadPreviousCounts() || {
    htmlCount: null,
    yamlCount: null,
    dbCount: null,
  };

  const htmlFile = getLatestHtmlFile();
  console.log(`📄 入力HTML: ${htmlFile}\n`);

  const html = fs.readFileSync(htmlFile, 'utf-8');

  // HTMLコメントで分割
  const parts = html.split(/<!-- Detail Page \d+: /);
  const animals = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // URLを抽出
    const urlMatch = part.match(/^(.+?) -->\s*([\s\S]+)/);
    if (!urlMatch) continue;

    const detailUrl = urlMatch[1].trim();
    const detailHtml = urlMatch[2];

    // 一覧ページ自体は除外
    if (
      detailUrl.endsWith('/jouto/yuzuriuke/') ||
      detailUrl.endsWith('/jouto/yuzuriuke/index.html')
    ) {
      continue;
    }

    const animal = extractAnimalInfo(detailHtml, detailUrl);
    if (animal) {
      animals.push(animal);
      console.log(`✅ 抽出: ${animal.name} (${animal.breed || '不明'}, ${animal.gender})`);
    }
  }

  console.log(`\n📊 抽出完了: ${animals.length}匹\n`);

  // 前回との比較
  if (previousCounts.yamlCount !== null) {
    const diff = animals.length - previousCounts.yamlCount;
    if (diff < 0) {
      console.warn(
        `⚠️  警告: 前回YAML (${previousCounts.yamlCount}匹) より ${Math.abs(diff)}匹減少しています`
      );
    }
  }

  logger.logYAMLCount(animals.length);

  // YAML出力
  const yamlDir = path.join(
    process.cwd(),
    'data',
    'yaml',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(yamlDir, { recursive: true });

  const timestamp = getJSTTimestamp();
  const yamlPath = path.join(yamlDir, `${timestamp}_animals.yaml`);

  const yamlData = {
    metadata: {
      municipality: CONFIG.municipality,
      source_url: CONFIG.source_url,
      scraped_at: getJSTISOString(),
      total_count: animals.length,
    },
    animals,
  };

  fs.writeFileSync(yamlPath, yaml.dump(yamlData, { lineWidth: -1, noRefs: true }), 'utf-8');

  console.log(`💾 YAML保存: ${yamlPath}`);
  console.log('\n' + '='.repeat(60));
  console.log('✅ YAML抽出完了');
  console.log('='.repeat(60));

  logger.finalize();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
