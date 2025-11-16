#!/usr/bin/env node

/**
 * 群馬県動物愛護センター（猫） YAML抽出スクリプト
 *
 * 特徴:
 * - 譲渡猫一覧ページから猫情報を抽出
 * - ニックネーム・管理番号・画像のみ取得（詳細は別ページ）
 * - YAML形式で出力
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import { getAdoptionStatus } from '../../../lib/adoption-status.js';
import { createLogger } from '../../../lib/history-logger.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'gunma/gunma-pref-cats',
  base_url: 'https://www.pref.gunma.jp',
  source_url: 'https://www.pref.gunma.jp/page/710676.html',
};

// ========================================
// ユーティリティ
// ========================================

/**
 * 最新のHTMLファイルを取得
 */
function getLatestHtmlFile() {
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

  return path.join(htmlDir, files[0]);
}

/**
 * 猫情報を抽出
 */
function extractCats($) {
  const cats = [];

  // ニックネーム：<a href="">名前</a>（管理番号XXXX） のパターンを探す
  $('p').each((i, elem) => {
    const $p = $(elem);
    const text = $p.text().trim();

    // ニックネーム：で始まる段落のみ処理
    if (!text.startsWith('ニックネーム：')) {
      return;
    }

    // リンクからニックネームを取得
    const $link = $p.find('a');
    if ($link.length === 0) {
      return;
    }

    const nickname = $link.text().trim();
    const detailUrl = $link.attr('href');
    const fullDetailUrl = detailUrl.startsWith('http') ? detailUrl : CONFIG.base_url + detailUrl;

    // 管理番号を抽出（（管理番号2025-F126））
    const idMatch = text.match(/管理番号([^\）]+)/);
    const managementNumber = idMatch ? idMatch[1].trim() : null;

    if (!managementNumber) {
      console.log(`  ⚠️  管理番号が見つかりません: ${text}`);
      return;
    }

    // 次のp要素から画像を取得
    let $nextP = $p.next('p');
    let images = [];

    while ($nextP.length > 0) {
      const $img = $nextP.find('img');
      if ($img.length > 0) {
        const src = $img.attr('src');
        if (src) {
          const fullUrl = src.startsWith('http') ? src : CONFIG.base_url + src;
          images.push(fullUrl);
        }
        break; // 画像を見つけたら終了
      }

      // 次のニックネームが来たら終了
      if ($nextP.text().startsWith('ニックネーム：')) {
        break;
      }

      $nextP = $nextP.next('p');
    }

    // 譲渡済み判定（ページ全体のテキスト範囲で判定）
    const status = getAdoptionStatus(text);

    cats.push({
      external_id: managementNumber,
      name: nickname,
      animal_type: 'cat',
      breed: null, // 詳細ページにのみ記載
      age_estimate: null, // 詳細ページにのみ記載
      gender: 'unknown', // 詳細ページにのみ記載
      color: null,
      size: null,
      health_status: null,
      personality: null,
      special_needs: null,
      images: images,
      protection_date: null,
      deadline_date: null,
      status: status,
      source_url: fullDetailUrl, // 詳細ページへのリンク
      confidence_level: 'medium', // 基本情報のみのためMEDIUM
      extraction_notes: [
        '詳細情報は別ページに記載（性別・年齢・品種など）',
        `詳細ページ: ${fullDetailUrl}`,
      ],
    });
  });

  return cats;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  const logger = createLogger(CONFIG.municipality);

  try {
    console.log('='.repeat(60));
    console.log('🐱 群馬県動物愛護センター（猫） - YAML抽出');
    console.log('='.repeat(60));
    console.log(`   Municipality: ${CONFIG.municipality}`);
    console.log('='.repeat(60) + '\n');

    // HTMLファイル読み込み
    const htmlPath = getLatestHtmlFile();
    console.log(`📄 HTMLファイル読み込み: ${path.basename(htmlPath)}`);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // 猫情報抽出
    console.log('🔍 猫情報を抽出中...');
    const cats = extractCats($);

    // ロガーにYAMLカウントを記録
    logger.logYAMLCount(cats.length);

    console.log(`✅ 抽出完了: ${cats.length}匹`);

    if (cats.length === 0) {
      console.log('⚠️  譲渡可能な猫が見つかりませんでした');
    } else {
      cats.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat.external_id})`);
      });
    }

    // YAML生成
    const timestamp = getJSTTimestamp();
    const yamlContent = yaml.dump(
      {
        meta: {
          source_file: `${timestamp}_tail.html`,
          source_url: CONFIG.source_url,
          extracted_at: getJSTISOString(),
          municipality: CONFIG.municipality,
          total_count: cats.length,
        },
        animals: cats,
      },
      { indent: 2, lineWidth: -1 }
    );

    // YAML保存
    const yamlDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    fs.mkdirSync(yamlDir, { recursive: true });

    const yamlFilename = `${timestamp}_tail.yaml`;
    const yamlPath = path.join(yamlDir, yamlFilename);

    fs.writeFileSync(yamlPath, yamlContent, 'utf-8');
    console.log(`\n💾 YAML保存完了: ${yamlPath}`);

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
  }
}

// 実行
main();
