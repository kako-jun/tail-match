#!/usr/bin/env node

/**
 * 高知県中央・中村小動物管理センター YAML抽出スクリプト
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';

const CONFIG = {
  municipality: 'kochi/kochi-pref',
  municipalityId: null, // TODO: DB登録後に設定
  base_url: 'https://kochi-apc.com',
  source_url: 'https://kochi-apc.com/jouto/',
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
 * カードから動物情報を抽出
 */
function extractAnimalFromCard($, card) {
  const $card = $(card);

  // 画像URL取得
  const $img = $card.find('.card-img img');
  const imgSrc = $img.attr('src');
  if (!imgSrc) return null;

  const imageUrl = imgSrc.startsWith('http') ? imgSrc : CONFIG.base_url + imgSrc;

  // エリア取得（中央/中村）
  const area = $card.find('.tab-list a').text().trim();

  // テーブルから情報を抽出
  const rows = $card.find('.animal-table table tbody tr').toArray();
  let managementNumber = '';
  let name = '';
  let breed = '';
  let gender = 'unknown';
  let collar = '';

  for (const row of rows) {
    const $row = $(row);
    const th = $row.find('th').text().trim();
    const td = $row.find('td').text().trim();

    if (th.includes('管理番号')) {
      managementNumber = td;
    } else if (th.includes('仮名')) {
      name = td;
    } else if (th.includes('種類')) {
      breed = td;
    } else if (th.includes('性別')) {
      if (td.includes('オス') || td.includes('雄')) {
        gender = 'male';
      } else if (td.includes('メス') || td.includes('雌')) {
        gender = 'female';
      }
    } else if (th.includes('首輪')) {
      collar = td;
    }
  }

  // external_id生成（管理番号から）
  const external_id = `kochi-pref-${managementNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  // 動物種判定（tab-listのリンクから）
  const tabLink = $card.find('.tab-list a').attr('href') || '';
  let animalType = 'unknown';
  if (tabLink.includes('maigojouto_cat=center_jouto_inu')) {
    animalType = 'dog';
  } else if (tabLink.includes('maigojouto_cat=center_jouto_neko')) {
    animalType = 'cat';
  }

  // フォールバック: 名前の接尾辞で判定
  if (animalType === 'unknown') {
    if (name.includes('くん')) {
      animalType = 'dog';
    } else if (name.includes('ちゃん')) {
      animalType = 'cat';
    }
  }

  // 更新日取得
  const updateDate = $card.find('.left-text').text().replace('更新日：', '').trim();

  const animalInfo = {
    external_id,
    municipality_id: CONFIG.municipalityId,
    name: name || managementNumber,
    gender,
    age_estimate: '', // 高知県は年齢情報なし
    birth_estimate: '',
    description: `エリア: ${area}\n種類: ${breed}\n首輪: ${collar}\n更新日: ${updateDate}`,
    status: 'available', // 「募集中」なので全員譲渡可能
    source_url: CONFIG.source_url,
    images: [imageUrl],
    scraped_at: getJSTISOString(),
    animal_type: animalType,
  };

  return animalInfo;
}

async function main() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();
  logger.loadPreviousCounts();

  console.log('='.repeat(60));
  console.log('🐾 高知県中央・中村小動物管理センター - YAML抽出');
  console.log('='.repeat(60) + '\n');

  try {
    // 最新HTMLファイルを取得
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 読み込み: ${htmlPath}`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // カードから動物情報を抽出（全タブから、重複は後で除去）
    console.log('🔍 動物情報を抽出中...');
    const allAnimals = [];
    $('.tab-animal-card').each((i, card) => {
      const animalInfo = extractAnimalFromCard($, card);
      if (animalInfo) {
        allAnimals.push(animalInfo);
      }
    });

    // external_idで重複除去（猫を優先）
    const animalMap = new Map();
    allAnimals.forEach((animal) => {
      const existing = animalMap.get(animal.external_id);
      if (!existing) {
        // 新規の動物
        animalMap.set(animal.external_id, animal);
      } else if (existing.animal_type === 'cat') {
        // 既存が猫なら保持
        return;
      } else if (animal.animal_type === 'cat') {
        // 新しい方が猫なら上書き
        animalMap.set(animal.external_id, animal);
      }
      // それ以外は既存を保持（犬同士の重複など）
    });
    const animals = Array.from(animalMap.values());

    console.log(`  📝 抽出: ${allAnimals.length}件 → 重複除去後: ${animals.length}件`);

    // 猫と犬を分類
    const cats = animals.filter((a) => a.animal_type === 'cat');
    const dogs = animals.filter((a) => a.animal_type === 'dog');
    const unknown = animals.filter((a) => a.animal_type === 'unknown');

    console.log(
      `✅ 猫: ${cats.length}匹、犬: ${dogs.length}匹、不明: ${unknown.length}匹を抽出しました`
    );
    console.log(`📊 合計: ${animals.length}匹`);
    logger.logYAMLCount(animals.length);

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
    const filename = `${timestamp}_animals.yaml`;
    const filepath = path.join(yamlDir, filename);

    // YAML保存
    const yamlContent = yaml.dump(animals, { indent: 2, lineWidth: -1 });
    fs.writeFileSync(filepath, yamlContent, 'utf-8');
    console.log(`💾 YAML保存: ${filepath}\n`);

    // 詳細表示
    console.log('詳細:');
    animals.forEach((animal, i) => {
      const typeLabel =
        animal.animal_type === 'cat' ? '猫' : animal.animal_type === 'dog' ? '犬' : '不明';
      console.log(`  ${i + 1}. [${typeLabel}] ${animal.name} (${animal.gender})`);
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
