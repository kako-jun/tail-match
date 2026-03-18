/**
 * SQLite データベース接続・操作ライブラリ
 *
 * better-sqlite3 を使用した同期的なSQLite操作
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

class TailMatchDB {
  constructor(dbPath = 'data/tail-match.db') {
    // データディレクトリを作成
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // データベース接続
    this.db = new Database(dbPath);

    // WAL モードに設定（並行読み書き性能向上）
    this.db.pragma('journal_mode = WAL');

    console.log(`📊 SQLite データベース接続: ${dbPath}`);
  }

  /**
   * スキーマを初期化
   */
  initializeSchema() {
    try {
      const schemaPath = path.join('database', 'schema-sqlite.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // スキーマを実行
      this.db.exec(schema);

      console.log('✅ データベーススキーマ初期化完了');

      // 初期化確認クエリの結果を表示
      const counts = this.db
        .prepare(
          `
        SELECT 
          'regions' as table_name, COUNT(*) as record_count FROM regions
        UNION ALL
        SELECT 
          'municipalities', COUNT(*) FROM municipalities
        UNION ALL
        SELECT 
          'tails', COUNT(*) FROM tails
        UNION ALL
        SELECT 
          'scraping_logs', COUNT(*) FROM scraping_logs
      `
        )
        .all();

      console.log('📊 初期化後のテーブル状況:');
      counts.forEach((row) => {
        console.log(`   ${row.table_name}: ${row.record_count} records`);
      });
    } catch (error) {
      console.error('❌ スキーマ初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 自治体情報を取得
   */
  getMunicipalities() {
    const stmt = this.db.prepare(`
      SELECT 
        m.*,
        r.name as region_name,
        r.code as region_code
      FROM municipalities m
      LEFT JOIN regions r ON m.region_id = r.id
      WHERE m.is_active = 1
      ORDER BY r.name, m.name
    `);

    return stmt.all();
  }

  /**
   * 特定の自治体情報を取得
   */
  getMunicipalityById(id) {
    const stmt = this.db.prepare(`
      SELECT 
        m.*,
        r.name as region_name,
        r.code as region_code
      FROM municipalities m
      LEFT JOIN regions r ON m.region_id = r.id
      WHERE m.id = ?
    `);

    return stmt.get(id);
  }

  /**
   * スクレイピングログを記録
   */
  logScrapingStart(municipalityId, htmlFilepath) {
    const stmt = this.db.prepare(`
      INSERT INTO scraping_logs (
        municipality_id, 
        started_at, 
        status, 
        html_filepath
      ) VALUES (?, ?, 'running', ?)
    `);

    const result = stmt.run(municipalityId, new Date().toISOString(), htmlFilepath);

    return result.lastInsertRowid;
  }

  /**
   * スクレイピング完了をログに記録
   */
  logScrapingComplete(logId, status, stats, error = null) {
    const stmt = this.db.prepare(`
      UPDATE scraping_logs SET
        completed_at = ?,
        status = ?,
        tails_found = ?,
        tails_added = ?,
        tails_updated = ?,
        tails_removed = ?,
        error_message = ?,
        execution_time_ms = ?,
        html_size = ?,
        detection_result = ?
      WHERE id = ?
    `);

    stmt.run(
      new Date().toISOString(),
      status,
      stats.tails_found || 0,
      stats.tails_added || 0,
      stats.tails_updated || 0,
      stats.tails_removed || 0,
      error,
      stats.execution_time_ms || 0,
      stats.html_size || 0,
      stats.detection_result ? JSON.stringify(stats.detection_result) : null,
      logId
    );
  }

  /**
   * 動物情報をUPSERT
   */
  /**
   * 動物情報をUPSERT
   * @returns {{ isNew: boolean }} isNew=true なら新規挿入、false なら更新
   */
  upsertTail(tailData) {
    // INSERT前に既存レコードの有無を確認（insert vs update を正確に判定するため）
    const existsStmt = this.db.prepare(
      `SELECT id FROM tails WHERE municipality_id = ? AND external_id = ?`
    );
    const existing = existsStmt.get(tailData.municipality_id, tailData.external_id);

    const stmt = this.db.prepare(`
      INSERT INTO tails (
        municipality_id, external_id, animal_type, name, breed,
        age_estimate, gender, color, size, health_status,
        personality, special_needs, images, protection_date,
        deadline_date, status, source_url, listing_type, last_scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(municipality_id, external_id)
      DO UPDATE SET
        name = excluded.name,
        breed = excluded.breed,
        age_estimate = excluded.age_estimate,
        gender = excluded.gender,
        color = excluded.color,
        size = excluded.size,
        health_status = excluded.health_status,
        personality = excluded.personality,
        special_needs = excluded.special_needs,
        images = excluded.images,
        protection_date = excluded.protection_date,
        deadline_date = excluded.deadline_date,
        status = excluded.status,
        source_url = excluded.source_url,
        listing_type = excluded.listing_type,
        last_scraped_at = excluded.last_scraped_at,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      tailData.municipality_id,
      tailData.external_id,
      tailData.animal_type || 'cat',
      tailData.name,
      tailData.breed,
      tailData.age_estimate,
      tailData.gender,
      tailData.color,
      tailData.size,
      tailData.health_status,
      tailData.personality,
      tailData.special_needs,
      tailData.images ? JSON.stringify(tailData.images) : null,
      tailData.protection_date,
      tailData.deadline_date,
      tailData.status || 'available',
      tailData.source_url,
      tailData.listing_type || 'adoption',
      new Date().toISOString()
    );

    return { isNew: !existing };
  }

  /**
   * スクレイピング対象外となった動物を削除状態にマーク
   */
  markTailsAsRemoved(municipalityId, currentExternalIds) {
    if (currentExternalIds.length === 0) {
      // 全ての動物を削除状態にマーク
      const stmt = this.db.prepare(`
        UPDATE tails 
        SET status = 'removed', updated_at = CURRENT_TIMESTAMP
        WHERE municipality_id = ? AND status = 'available'
      `);

      const result = stmt.run(municipalityId);
      return result.changes;
    } else {
      // 指定された外部ID以外を削除状態にマーク
      const placeholders = currentExternalIds.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        UPDATE tails 
        SET status = 'removed', updated_at = CURRENT_TIMESTAMP
        WHERE municipality_id = ? 
          AND external_id NOT IN (${placeholders})
          AND status = 'available'
      `);

      const result = stmt.run(municipalityId, ...currentExternalIds);
      return result.changes;
    }
  }

  /**
   * 最新のスクレイピング統計を取得
   */
  getLatestScrapingStats(municipalityId = null) {
    let query = `
      SELECT 
        m.name as municipality_name,
        sl.*
      FROM scraping_logs sl
      JOIN municipalities m ON sl.municipality_id = m.id
    `;

    if (municipalityId) {
      query += ` WHERE sl.municipality_id = ?`;
    }

    query += ` ORDER BY sl.started_at DESC LIMIT 10`;

    const stmt = this.db.prepare(query);

    return municipalityId ? stmt.all(municipalityId) : stmt.all();
  }

  /**
   * 利用可能な動物の一覧を取得
   */
  getAvailableTails(municipalityId = null, animalType = null) {
    let query = `
      SELECT 
        t.*,
        m.name as municipality_name,
        r.name as region_name
      FROM tails t
      JOIN municipalities m ON t.municipality_id = m.id
      JOIN regions r ON m.region_id = r.id
      WHERE t.status = 'available'
    `;

    const params = [];

    if (municipalityId) {
      query += ` AND t.municipality_id = ?`;
      params.push(municipalityId);
    }

    if (animalType) {
      query += ` AND t.animal_type = ?`;
      params.push(animalType);
    }

    query += ` ORDER BY t.protection_date DESC, t.created_at DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * データベースを閉じる
   */
  /**
   * 同じセンターで同じ名前の動物がいないかチェックし、重複を回避
   */
  ensureUniqueName(municipalityId, baseName) {
    // 同じセンターで同じ名前の動物を検索
    const stmt = this.db.prepare(`
      SELECT name FROM tails
      WHERE municipality_id = ? AND name LIKE ?
      ORDER BY name
    `);

    const existingNames = stmt.all(municipalityId, `${baseName}%`).map((row) => row.name);

    // 重複がない場合はそのまま返す
    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    // 重複がある場合、連番を付与
    let suffix = 2;
    let uniqueName = `${baseName}-${suffix}`;

    while (existingNames.includes(uniqueName)) {
      suffix++;
      uniqueName = `${baseName}-${suffix}`;
    }

    return uniqueName;
  }

  close() {
    this.db.close();
    console.log('📊 データベース接続を閉じました');
  }
}

// シングルトンインスタンス
let dbInstance = null;

/**
 * データベースインスタンスを取得
 */
export function getDB() {
  if (!dbInstance) {
    dbInstance = new TailMatchDB();
  }
  return dbInstance;
}

/**
 * データベースを初期化
 */
export function initializeDatabase() {
  const db = getDB();
  db.initializeSchema();
  return db;
}

/**
 * データベースを閉じる
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// デフォルトエクスポート
export default getDB;
