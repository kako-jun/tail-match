#!/usr/bin/env node

/**
 * 岡山県動物愛護センター HTML→YAML変換
 *
 * ページ構造:
 * - table形式、犬猫混在ページ
 * - セクション見出しで犬/猫を判定
 * - 各行が動物情報を含む
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../../../lib/history-logger.js';
import { getJSTTimestamp } from '../../../lib/timestamp.js';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const YAML_DIR = path.join(__dirname, 'yaml');
const HTML_FILE = path.join(DATA_DIR, 'latest.html');

const CONFIG = {
  municipality: 'okayama/okayama-pref',
  sourceUrl: 'https://www.pref.okayama.jp/page/859555.html',
};

async function parseHTML() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('📝 岡山県動物愛護センター - HTML→YAML変換');
  console.log('='.repeat(60) + '\n');
  console.log(`⏱️  開始時刻: ${getJSTTimestamp()}\n`);

  if (!fs.existsSync(HTML_FILE)) {
    const errorMsg = `❌ HTMLファイルが見つかりません: ${HTML_FILE}`;
    console.error(errorMsg);
    logger.addError(errorMsg);
    logger.finalize();
    process.exit(1);
  }

  console.log('📖 HTMLファイルを読み込み中...');
  const html = fs.readFileSync(HTML_FILE, 'utf-8');
  const $ = cheerio.load(html);

  const cats = [];
  const dogs = [];

  // tableごとに処理
  $('table').each((_, table) => {
    const $table = $(table);

    // captionで動物種を判定
    const caption = $table.find('caption').text().trim();
    let currentType = null;

    if (caption.includes('保護収容情報（犬）') || caption.includes('犬')) {
      currentType = 'dog';
    } else if (caption.includes('保護収容情報（猫）') || caption.includes('猫')) {
      currentType = 'cat';
    }

    if (!currentType) return; // 動物種が判定できない場合はスキップ

    // tbody内のデータ行を処理
    $table.find('tbody tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length < 9) return; // データ行でない場合はスキップ

      // 各セルからデータを抽出
      const 収容日 = $(cells[0]).text().trim();
      const 管理番号 = $(cells[1]).text().trim();
      const 種類 = $(cells[2]).text().trim();
      const 年齢 = $(cells[3]).text().trim();
      const 毛色 = $(cells[4]).text().trim();
      const 性別 = $(cells[5]).text().trim();
      const 体格 = $(cells[6]).text().trim();
      const 特徴 = $(cells[7]).text().trim();
      const 場所 = $(cells[8]).text().trim();

      // 写真を取得
      const $img = $(cells[9]).find('img');
      let imageUrl = null;
      if ($img.length > 0) {
        const src = $img.attr('src');
        if (src && !src.includes('noimage')) {
          imageUrl = src.startsWith('http') ? src : `https://www.pref.okayama.jp${src}`;
        }
      }

      if (!管理番号) return; // 管理番号がない場合はスキップ

      const animal = {
        external_id: 管理番号,
        name: null,
        species: currentType === 'cat' ? '猫' : '犬',
        breed: 種類 || null,
        age: 年齢 || null,
        gender: 性別 === 'オス' ? 'male' : 性別 === 'メス' ? 'female' : 'unknown',
        color: 毛色 || null,
        size: 体格 || null,
        description: [特徴, `収容日: ${収容日}`, `収容場所: ${場所}`].filter(Boolean).join('\n'),
        image_url: imageUrl,
        status: 'available',
        source_url: CONFIG.sourceUrl,
        scraped_at: new Date().toISOString(),
      };

      if (currentType === 'cat') {
        cats.push(animal);
      } else {
        dogs.push(animal);
      }
    });
  });

  const totalAnimals = cats.length + dogs.length;
  console.log(`\n🐱 猫: ${cats.length}匹`);
  console.log(`🐶 犬: ${dogs.length}匹`);
  console.log(`📊 合計: ${totalAnimals}匹`);
  logger.logYAMLCount(totalAnimals);

  // YAML保存
  if (!fs.existsSync(YAML_DIR)) {
    fs.mkdirSync(YAML_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let savedFiles = 0;

  if (cats.length > 0) {
    const catsYaml = yaml.dump(cats, { lineWidth: -1 });
    const catsFile = path.join(YAML_DIR, `cats-${timestamp}.yaml`);
    fs.writeFileSync(catsFile, catsYaml, 'utf-8');
    console.log(`\n✅ 猫データを保存: ${path.basename(catsFile)}`);
    savedFiles++;

    const catsLatest = path.join(YAML_DIR, 'cats-latest.yaml');
    fs.writeFileSync(catsLatest, catsYaml, 'utf-8');
    console.log(`   cats-latest.yaml を更新`);
  }

  if (dogs.length > 0) {
    const dogsYaml = yaml.dump(dogs, { lineWidth: -1 });
    const dogsFile = path.join(YAML_DIR, `dogs-${timestamp}.yaml`);
    fs.writeFileSync(dogsFile, dogsYaml, 'utf-8');
    console.log(`\n✅ 犬データを保存: ${path.basename(dogsFile)}`);
    savedFiles++;

    const dogsLatest = path.join(YAML_DIR, 'dogs-latest.yaml');
    fs.writeFileSync(dogsLatest, dogsYaml, 'utf-8');
    console.log(`   dogs-latest.yaml を更新`);
  }

  if (savedFiles === 0) {
    console.log('\n⚠️  保存するデータがありませんでした');
  }

  logger.finalize();

  console.log(`\n⏱️  終了時刻: ${getJSTTimestamp()}`);
  console.log('='.repeat(60));
}

parseHTML().catch(console.error);
