#!/usr/bin/env node

/**
 * いしかわ動物愛護センター HTMLパーサー
 *
 * 目的：保存されたHTMLファイルからSQLiteにデータを抽出・投入
 * Step 2: HTMLパース→SQLite（CLAUDE.mdアーキテクチャの2ステップ目）
 */

import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import { initializeDatabase, getDB, closeDatabase } from './lib/db.js';

// ========================================
// 設定
// ========================================

const CONFIG = {
  municipality: 'ishikawa',
  htmlDir: 'data/html/ishikawa',
  municipalityId: 1, // データベース内のいしかわ動物愛護センターのID

  // 抽出ルール
  selectors: {
    containers: '.data_box, .animal-card, .pet-item',
    name: '.name, .pet-name, h3, h4',
    details: '.details, .pet-details, .info',
    image: 'img',
  },

  // 正規表現パターン
  patterns: {
    gender: /(?:オス|雄|♂|male)|(?:メス|雌|♀|female)/i,
    age: /(?:生後|約)?(\d+)(?:歳|才|ヶ月|か月|ヵ月)|(?:子猫|成猫|シニア)/i,
    color: /(?:白|黒|茶|灰|三毛|みけ|キジ|サビ|茶白|白黒|グレー)/i,
    id: /No\.?\s*(\d+)|ID[\s:]*(\d+)|管理番号[\s:]*(\d+)/i,
  },
};

// ========================================
// HTML解析関数
// ========================================

/**
 * HTMLファイルから猫データを抽出
 */
function extractCatsFromHTML(html, sourceUrl) {
  const $ = load(html);
  const cats = [];

  console.log('🔍 HTML解析開始...');

  // データコンテナを検索
  const containers = $(CONFIG.selectors.containers);
  console.log(`   コンテナ発見: ${containers.length}個`);

  if (containers.length === 0) {
    // フォールバック: 猫関連テキストを含む要素を探す
    console.log('   フォールバック解析を実行...');
    return extractCatsFromText($, sourceUrl);
  }

  // 各コンテナから猫データを抽出
  containers.each((index, container) => {
    const $container = $(container);

    try {
      const cat = extractCatFromContainer($container, index + 1, sourceUrl);
      if (cat) {
        cats.push(cat);
        console.log(`   猫 ${index + 1}: ${cat.name || '名前不明'} (${cat.gender || '性別不明'})`);
      }
    } catch (error) {
      console.warn(`   コンテナ ${index + 1} の解析エラー:`, error.message);
    }
  });

  console.log(`✅ 抽出完了: ${cats.length}匹`);
  return cats;
}

/**
 * 個別コンテナから猫データを抽出
 */
function extractCatFromContainer($container, index, sourceUrl) {
  const text = $container.text();

  // 基本情報抽出
  const name = extractName($container) || `保護猫${index}号`;
  const externalId = extractExternalId(text) || `ishikawa_${Date.now()}_${index}`;
  const gender = extractGender(text);
  const age = extractAge(text);
  const color = extractColor(text);

  // 画像URL抽出
  const images = [];
  $container.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src) {
      // 相対URLを絶対URLに変換
      const imageUrl = src.startsWith('http')
        ? src
        : `https://aigo-ishikawa.jp${src.startsWith('/') ? '' : '/'}${src}`;
      images.push(imageUrl);
    }
  });

  return {
    municipality_id: CONFIG.municipalityId,
    external_id: externalId,
    animal_type: 'cat',
    name: name,
    breed: 'ミックス', // 一般的に品種情報は少ないため
    age_estimate: age,
    gender: normalizeGender(gender),
    color: color,
    size: 'medium', // デフォルト値
    health_status: extractHealthInfo(text),
    personality: extractPersonality(text),
    special_needs: extractSpecialNeeds(text),
    images: images,
    protection_date: extractDate(text, 'protection'),
    deadline_date: extractDate(text, 'deadline'),
    status: 'available',
    transfer_decided: 0,
    source_url: sourceUrl,
  };
}

/**
 * フォールバック: テキストベース抽出
 */
function extractCatsFromText($, sourceUrl) {
  const cats = [];
  const pageText = $('body').text();

  // 猫関連キーワードでセクションを分割
  const catSections = pageText
    .split(/(?=猫|ネコ|ねこ)/)
    .filter(
      (section) => section.includes('猫') || section.includes('ネコ') || section.includes('ねこ')
    );

  catSections.forEach((section, index) => {
    if (section.length > 20 && section.length < 1000) {
      // 適度な長さのセクション
      const cat = {
        municipality_id: CONFIG.municipalityId,
        external_id: `text_${Date.now()}_${index}`,
        animal_type: 'cat',
        name: `保護猫${index + 1}号`,
        breed: 'ミックス',
        age_estimate: extractAge(section),
        gender: normalizeGender(extractGender(section)),
        color: extractColor(section),
        size: 'medium',
        health_status: extractHealthInfo(section),
        status: 'available',
        source_url: sourceUrl,
      };

      cats.push(cat);
    }
  });

  return cats;
}

// ========================================
// データ抽出ヘルパー関数
// ========================================

function extractName($container) {
  const nameSelectors = ['.name', '.pet-name', 'h3', 'h4', '.title'];

  for (const selector of nameSelectors) {
    const nameEl = $container.find(selector).first();
    if (nameEl.length && nameEl.text().trim()) {
      return nameEl.text().trim();
    }
  }

  return null;
}

function extractExternalId(text) {
  const match = text.match(CONFIG.patterns.id);
  return match ? match[1] || match[2] || match[3] : null;
}

function extractGender(text) {
  const match = text.match(CONFIG.patterns.gender);
  return match ? match[0] : null;
}

function normalizeGender(genderText) {
  if (!genderText) return 'unknown';

  const text = genderText.toLowerCase();
  if (
    text.includes('オス') ||
    text.includes('雄') ||
    text.includes('♂') ||
    text.includes('male')
  ) {
    return 'male';
  } else if (
    text.includes('メス') ||
    text.includes('雌') ||
    text.includes('♀') ||
    text.includes('female')
  ) {
    return 'female';
  }
  return 'unknown';
}

function extractAge(text) {
  const match = text.match(CONFIG.patterns.age);
  if (match) {
    return match[0];
  }

  // キーワードベース判定
  if (text.includes('子猫') || text.includes('仔猫')) return '子猫';
  if (text.includes('成猫')) return '成猫';
  if (text.includes('シニア') || text.includes('高齢')) return 'シニア猫';

  return null;
}

function extractColor(text) {
  const match = text.match(CONFIG.patterns.color);
  return match ? match[0] : null;
}

function extractHealthInfo(text) {
  const healthKeywords = ['健康', 'ワクチン', '去勢', '避妊', '病気', '治療', '薬'];
  const healthInfo = [];

  healthKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      // キーワード周辺のテキストを抽出
      const regex = new RegExp(`[^。]*${keyword}[^。]*`, 'i');
      const match = text.match(regex);
      if (match) {
        healthInfo.push(match[0].trim());
      }
    }
  });

  return healthInfo.length > 0 ? healthInfo.join('; ') : null;
}

function extractPersonality(text) {
  const personalityKeywords = ['性格', '人懐っこい', 'おとなしい', '活発', '甘えん坊', '臆病'];

  for (const keyword of personalityKeywords) {
    if (text.includes(keyword)) {
      const regex = new RegExp(`[^。]*${keyword}[^。]*`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0].trim();
      }
    }
  }

  return null;
}

function extractSpecialNeeds(text) {
  const specialKeywords = ['特別', '注意', '投薬', '介護', 'ケア'];

  for (const keyword of specialKeywords) {
    if (text.includes(keyword)) {
      const regex = new RegExp(`[^。]*${keyword}[^。]*`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0].trim();
      }
    }
  }

  return null;
}

function extractDate(text, type) {
  // 日付パターンの抽出（簡易版）
  const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日|\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
  const match = text.match(datePattern);

  if (match) {
    if (match[1]) {
      // 年月日形式
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    } else {
      // ISO形式
      return match[0].replace(/\//g, '-');
    }
  }

  return null;
}

// ========================================
// メイン処理
// ========================================

async function parseAllHTMLFiles() {
  console.log('='.repeat(60));
  console.log('🐱 いしかわ動物愛護センター - HTMLパース→SQLite');
  console.log('='.repeat(60));

  try {
    // データベース初期化
    console.log('📊 データベース初期化...');
    const db = initializeDatabase();

    // HTMLファイルを検索
    const htmlFiles = [];
    const archiveDir = path.join(CONFIG.htmlDir, 'archive');

    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir);
      files.forEach((file) => {
        if (file.endsWith('.html')) {
          htmlFiles.push(path.join(archiveDir, file));
        }
      });
    }

    console.log(`\n📁 発見したHTMLファイル: ${htmlFiles.length}個`);

    let totalCatsProcessed = 0;
    let totalCatsAdded = 0;

    // 各HTMLファイルを処理
    for (const htmlFile of htmlFiles) {
      console.log(`\n📄 処理中: ${path.basename(htmlFile)}`);

      const html = fs.readFileSync(htmlFile, 'utf-8');
      const sourceUrl = 'https://aigo-ishikawa.jp/petadoption_list/';

      // 猫データを抽出
      const cats = extractCatsFromHTML(html, sourceUrl);
      totalCatsProcessed += cats.length;

      // データベースに保存
      for (const cat of cats) {
        try {
          const result = db.upsertTail(cat);
          if (result) {
            totalCatsAdded++;
          }
        } catch (error) {
          console.error(`   データ保存エラー:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ HTMLパース完了');
    console.log(`📊 処理結果:`);
    console.log(`   HTMLファイル: ${htmlFiles.length}個`);
    console.log(`   抽出した猫: ${totalCatsProcessed}匹`);
    console.log(`   DB保存: ${totalCatsAdded}匹`);
    console.log('='.repeat(60));

    // データベースの内容を確認
    const availableCats = db.getAvailableTails(CONFIG.municipalityId);
    console.log(`\n🐱 現在の利用可能な猫: ${availableCats.length}匹`);

    availableCats.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (${cat.gender}, ${cat.color || '色不明'})`);
    });
  } catch (error) {
    console.error('\n❌ パース処理エラー:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  parseAllHTMLFiles();
}
