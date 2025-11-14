#!/usr/bin/env node

/**
 * 名古屋市動物愛護センター 画像から情報抽出スクリプト
 *
 * HTMLから画像URLリストを取得し、画像をダウンロードしてテンプレートYAMLを生成
 * 画像内の情報は後でOCR処理またはClaude Vision APIで抽出
 */

import fs from 'fs';
import { getJSTTimestamp, getJSTISOString } from '../../../lib/timestamp.js';
import path from 'path';
import { load } from 'cheerio';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'aichi/nagoya-city',
  base_url: 'https://dog-cat-support.nagoya',
  adoption_url: 'https://dog-cat-support.nagoya/adoption/',
};

// ========================================
// 最新HTMLファイル取得
// ========================================

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

// ========================================
// 画像ダウンロード
// ========================================

async function downloadImage(url, outputPath) {
  try {
    await execAsync(`curl -k -s -o "${outputPath}" "${url}"`);
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
  } catch (error) {
    console.error(`   ❌ ダウンロードエラー: ${error.message}`);
    return false;
  }
}

// ========================================
// HTMLから画像情報を抽出
// ========================================

function extractImageInfo($) {
  const imageInfoList = [];

  // すべての画像リンクを探す（h3見出しは存在しない）
  $('a[href$=".html"]').each((i, link) => {
    const $link = $(link);
    const detailUrl = $link.attr('href');
    const $img = $link.find('img');

    if (!detailUrl || !$img.length) return;

    const imgSrc = $img.attr('src');
    const imgAlt = $img.attr('alt') || '';

    // 画像のaltテキストから日付を抽出: 【1】2025年11月14日掲載
    const dateMatch = imgAlt.match(/(\d{4})年(\d+)月(\d+)日掲載/);
    if (!dateMatch) return;

    const year = dateMatch[1];
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    const dateCode = `${year.slice(-2)}${month}${day}`; // 例: 251114

    // 管理番号を生成（ファイル名から: 251114-001.html）
    const numberMatch = detailUrl.match(/(\d{6})-(\d{3})/);
    if (!numberMatch) return;

    const externalId = `nagoya-${numberMatch[1]}-${numberMatch[2]}`;

    // ステータス画像を確認（リンクの次の兄弟要素）
    const $parent = $link.parent();
    const $nextDiv = $parent.next('div');
    let status = 'available';

    if ($nextDiv.length > 0) {
      const $statusImg = $nextDiv.find('img');
      if ($statusImg.length > 0) {
        const statusSrc = $statusImg.attr('src');
        if (statusSrc && statusSrc.includes('non.png')) {
          status = 'adopted';
        } else if (statusSrc && statusSrc.includes('under.png')) {
          status = 'under_consideration';
        }
      }
    }

    // 画像URLを完全なURLに変換
    let fullImgUrl = imgSrc;
    if (imgSrc && imgSrc.startsWith('../')) {
      fullImgUrl = CONFIG.base_url + imgSrc.substring(2);
    }

    // 詳細URLも変換
    let fullDetailUrl = detailUrl;
    if (detailUrl && !detailUrl.startsWith('http')) {
      fullDetailUrl = CONFIG.adoption_url + detailUrl;
    }

    imageInfoList.push({
      external_id: externalId,
      date_code: dateCode,
      image_url: fullImgUrl,
      detail_url: fullDetailUrl,
      status: status,
      posted_date: `${year}-${month}-${day}`,
    });
  });

  return imageInfoList;
}

// ========================================
// テンプレートデータ作成
// ========================================

function createTemplateData(imageInfo) {
  return {
    external_id: imageInfo.external_id,
    name: null, // OCR処理で抽出
    animal_type: 'unknown', // OCR処理で判定（猫/犬）
    breed: null,
    age_estimate: null,
    gender: 'unknown',
    color: null,
    size: null,
    health_status: null,
    personality: null,
    special_needs: null,
    images: [imageInfo.image_url],
    protection_date: null,
    deadline_date: null,
    status: imageInfo.status,
    source_url: imageInfo.detail_url,
    confidence_level: 'low',
    extraction_notes: ['画像OCR処理が必要', `掲載日: ${imageInfo.posted_date}`],
    listing_type: 'adoption',
    needs_review: true,
  };
}

// ========================================
// 前回の最終譲渡可能日を取得
// ========================================

function getLastAvailableDate() {
  try {
    const yamlDir = path.join(
      process.cwd(),
      'data',
      'yaml',
      CONFIG.municipality.replace('/', path.sep)
    );

    if (!fs.existsSync(yamlDir)) return null;

    const yamlFiles = fs
      .readdirSync(yamlDir)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .reverse();

    if (yamlFiles.length === 0) return null;

    const latestYaml = fs.readFileSync(path.join(yamlDir, yamlFiles[0]), 'utf-8');
    const data = yaml.load(latestYaml);

    return data?.meta?.last_available_date || null;
  } catch (error) {
    return null;
  }
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(60));
  console.log('🐱🐕 名古屋市動物愛護センター - 画像情報抽出');
  console.log('='.repeat(60) + '\n');

  // 前回の最終譲渡可能日を取得
  const lastAvailableDate = getLastAvailableDate();
  if (lastAvailableDate) {
    console.log(`📅 前回の最終譲渡可能日: ${lastAvailableDate}`);
    console.log(`   この日以降のデータのみ処理します\n`);
  }

  // HTMLファイル読み込み
  const htmlFile = getLatestHtmlFile();
  console.log(`📄 HTML読み込み: ${path.basename(htmlFile)}\n`);

  const html = fs.readFileSync(htmlFile, 'utf-8');
  const $ = load(html);

  // 画像情報を抽出
  let imageInfoList = extractImageInfo($);
  console.log(`📊 画像情報を${imageInfoList.length}件抽出しました`);

  // 前回の最終日以降のみにフィルタリング
  if (lastAvailableDate) {
    const originalCount = imageInfoList.length;
    imageInfoList = imageInfoList.filter((info) => info.posted_date >= lastAvailableDate);
    console.log(`   → ${lastAvailableDate}以降にフィルタ: ${imageInfoList.length}件`);
    console.log(`   （${originalCount - imageInfoList.length}件の古いデータをスキップ）\n`);
  } else {
    console.log('\n');
  }

  // 画像保存ディレクトリ
  const imageDir = path.join(
    process.cwd(),
    'data',
    'images',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(imageDir, { recursive: true });

  const animals = [];

  // 各画像をダウンロード
  for (let i = 0; i < imageInfoList.length; i++) {
    const imageInfo = imageInfoList[i];
    const imageFilename = `${imageInfo.external_id}.jpg`;
    const imagePath = path.join(imageDir, imageFilename);

    console.log(`[${i + 1}/${imageInfoList.length}] ${imageInfo.external_id}`);
    console.log(`   掲載日: ${imageInfo.posted_date}`);
    console.log(`   状態: ${imageInfo.status}`);

    // ダウンロード
    console.log(`   ダウンロード中...`);
    const success = await downloadImage(imageInfo.image_url, imagePath);

    if (!success) {
      console.log(`   ❌ ダウンロード失敗`);
      continue;
    }

    const stats = fs.statSync(imagePath);
    console.log(`   ✅ ダウンロード完了: ${(stats.size / 1024).toFixed(1)}KB\n`);

    // テンプレートデータを作成
    const animalData = createTemplateData(imageInfo);
    animals.push(animalData);
  }

  // YAML出力
  console.log(`${'='.repeat(60)}`);
  console.log('📝 YAML生成中...');

  const outputDir = path.join(
    process.cwd(),
    'data',
    'yaml',
    CONFIG.municipality.replace('/', path.sep)
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = getJSTTimestamp();
  const outputFile = path.join(outputDir, `${timestamp}_images_template.yaml`);

  // 最後の「available」ステータスの掲載日を記録（効率化のため）
  const newLastAvailableDate = animals
    .filter((a) => a.status === 'available')
    .map((a) => a.extraction_notes.find((n) => n.includes('掲載日:')))
    .filter((n) => n)
    .map((n) => n.replace('掲載日: ', ''))
    .sort()
    .reverse()[0];

  const yamlContent = yaml.dump(
    {
      meta: {
        source_file: path.basename(htmlFile),
        source_url: CONFIG.adoption_url,
        extracted_at: getJSTISOString(),
        municipality: CONFIG.municipality,
        total_count: animals.length,
        available_count: animals.filter((a) => a.status === 'available').length,
        adopted_count: animals.filter((a) => a.status === 'adopted').length,
        last_available_date: newLastAvailableDate || null,
        extraction_type: 'image_download_template',
        note: '画像をダウンロード済み。OCR処理またはClaude Vision APIでデータを埋める必要があります。次回実行時はlast_available_date以降のみ処理可能。',
      },
      confidence_level: 'low',
      consistency_warnings: [
        '画像内の情報をOCR処理で確認する必要があります',
        '名前、動物種（猫/犬）、性別、年齢、毛色、健康状態、性格を画像から読み取ってください',
      ],
      animals: animals,
    },
    { indent: 2, lineWidth: -1 }
  );

  fs.writeFileSync(outputFile, yamlContent, 'utf-8');

  console.log(`✅ YAML出力完了: ${outputFile}`);
  console.log(`📊 動物数: ${animals.length}`);
  console.log(`   - 譲渡可能: ${animals.filter((a) => a.status === 'available').length}匹`);
  console.log(`   - 譲渡済み: ${animals.filter((a) => a.status === 'adopted').length}匹`);
  console.log(`   - 相談中: ${animals.filter((a) => a.status === 'under_consideration').length}匹`);
  if (newLastAvailableDate) {
    console.log(`📅 最後の譲渡可能日: ${newLastAvailableDate}`);
    console.log(`   （次回はこの日以降のみ処理すると効率的）`);
  }
  console.log(`📁 画像保存先: ${imageDir}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 画像ダウンロード完了');
  console.log('='.repeat(60));
  console.log('\n次のステップ:');
  console.log('  1. data/images/aichi/nagoya-city/ の画像を確認');
  console.log('  2. OCR処理またはClaude Vision APIで情報を抽出');
  console.log('  3. update-yaml-from-ocr.js で情報を更新');
}

// 実行
main();
