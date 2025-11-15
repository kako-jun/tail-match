#!/usr/bin/env node

/**
 * 岡山市保健所 猫用 HTML→YAML変換
 *
 * ページ構造:
 * - h3タグで各猫を区切り（例：1C2025123(甘平くん)）
 * - 次のdiv.mol_textblockに詳細情報（pタグ）
 * - 次のdiv.mol_imageblockに画像
 * - 譲渡済み: h3内に「☆譲渡が決定しました！」
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
  municipality: 'okayama/okayama-city-cats',
  sourceUrl: 'https://www.city.okayama.jp/kurashi/0000016404.html',
};

async function parseHTML() {
  const logger = createLogger(CONFIG.municipality);
  logger.start();

  console.log('='.repeat(60));
  console.log('📝 岡山市保健所（猫） - HTML→YAML変換');
  console.log('='.repeat(60) + '\n');
  console.log(`⏱️  開始時刻: ${getJSTTimestamp()}\n`);

  if (!fs.existsSync(HTML_FILE)) {
    const errorMsg = `❌ HTMLファイルが見つかりません: ${HTML_FILE}`;
    console.error(errorMsg);
    logger.logError(new Error(errorMsg));
    logger.finalize();
    process.exit(1);
  }

  console.log('📖 HTMLファイルを読み込み中...');
  const html = fs.readFileSync(HTML_FILE, 'utf-8');
  const $ = cheerio.load(html);

  const cats = [];

  // h3タグで各猫のセクションを探す
  $('h3').each((_, elem) => {
    const $h3 = $(elem);
    const h3Text = $h3.text().trim();

    // 管理番号パターン（1C番号）
    const idMatch = h3Text.match(/1C(\d+)/);
    if (!idMatch) return; // 管理番号がない場合はスキップ

    const managementId = `1C${idMatch[1]}`;

    // 仮名を抽出（括弧内）
    const nameMatch = h3Text.match(/\((.+?)\)/);
    const name = nameMatch ? nameMatch[1].replace(/くん|ちゃん|君/, '') : null;

    // 譲渡済み判定
    const isAdopted = h3Text.includes('☆譲渡が決定しました') || h3Text.includes('譲渡が決定');
    const isPending = h3Text.includes('☆お声かかり中');

    // 次のdiv.mol_textblockから詳細情報を取得
    const $nextTextBlock = $h3.nextAll('div.mol_textblock').first();
    let breed = null;
    let gender = 'unknown';
    let weight = null;
    let age = null;
    let heartworm = null;
    let description = '';

    $nextTextBlock.find('p').each((_, p) => {
      const pText = $(p).text().trim();

      if (pText.includes('種類：')) {
        breed = pText.replace('種類：', '').trim();
      } else if (pText.includes('性別：')) {
        const genderText = pText.replace('性別：', '').trim();
        if (genderText.includes('オス')) {
          gender = 'male';
        } else if (genderText.includes('メス')) {
          gender = 'female';
        }
      } else if (pText.includes('体重：')) {
        weight = pText.replace('体重：', '').trim();
      } else if (pText.includes('年齢：')) {
        age = pText.replace('年齢：', '').trim();
      } else if (pText.includes('フィラリア検査：') || pText.includes('フィラリア：')) {
        heartworm = pText.replace(/フィラリア(検査)?：/, '').trim();
      } else if (pText && !pText.includes('名前(仮)：')) {
        // その他の説明文
        if (description) description += '\n';
        description += pText;
      }
    });

    // 画像を取得（次のdiv.mol_imageblock内）
    const $nextImageBlock = $h3.nextAll('div.mol_imageblock').first();
    const $img = $nextImageBlock.find('img').first();
    let imageUrl = null;
    if ($img.length > 0) {
      const src = $img.attr('src');
      if (src && !src.includes('clearspacer')) {
        imageUrl = src.startsWith('http')
          ? src
          : src.startsWith('/')
            ? `https://www.city.okayama.jp${src}`
            : `https://www.city.okayama.jp/kurashi/${src}`;
      }
    }

    const descriptionParts = [];
    if (weight) descriptionParts.push(`体重: ${weight}`);
    if (heartworm) descriptionParts.push(`フィラリア検査: ${heartworm}`);
    if (description) descriptionParts.push(description);

    const dog = {
      external_id: managementId,
      name,
      species: '猫',
      breed: breed || null,
      age: age || null,
      gender,
      color: null,
      size: null,
      description: descriptionParts.join('\n') || null,
      image_url: imageUrl,
      status: isAdopted ? 'adopted' : isPending ? 'pending' : 'available',
      source_url: CONFIG.sourceUrl,
      scraped_at: new Date().toISOString(),
    };

    cats.push(dog);
  });

  console.log(`\n🐶 猫: ${cats.length}匹`);
  logger.logYAMLCount(cats.length);

  // YAML保存
  if (!fs.existsSync(YAML_DIR)) {
    fs.mkdirSync(YAML_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (cats.length > 0) {
    const catsYaml = yaml.dump(cats, { lineWidth: -1 });
    const catsFile = path.join(YAML_DIR, `cats-${timestamp}.yaml`);
    fs.writeFileSync(catsFile, catsYaml, 'utf-8');
    console.log(`\n✅ 猫データを保存: ${path.basename(catsFile)}`);

    const catsLatest = path.join(YAML_DIR, 'cats-latest.yaml');
    fs.writeFileSync(catsLatest, catsYaml, 'utf-8');
    console.log(`   cats-latest.yaml を更新`);
  } else {
    console.log('\n⚠️  保存するデータがありませんでした');
  }

  logger.finalize();

  console.log(`\n⏱️  終了時刻: ${getJSTTimestamp()}`);
  console.log('='.repeat(60));
}

parseHTML().catch(console.error);
