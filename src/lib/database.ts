import { getRequestContext } from '@cloudflare/next-on-pages';

interface QueryResult {
  rows: any[];
  rowCount: number;
}

/**
 * D1データベースバインディングを取得
 */
function getDB(): D1Database {
  const { env } = getRequestContext();
  return (env as any).DB as D1Database;
}

/**
 * パラメータプレースホルダ $1,$2... をSQLite の ? に変換
 */
function convertParams(text: string): string {
  return text.replace(/\$\d+/g, '?');
}

/**
 * SQLクエリを実行（D1互換）
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const db = getDB();
  const sqliteText = convertParams(text);
  const start = Date.now();

  try {
    const stmt = db.prepare(sqliteText);
    const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;

    // SELECT系かどうかを判定
    const trimmed = sqliteText.trim().toUpperCase();
    if (
      trimmed.startsWith('SELECT') ||
      trimmed.startsWith('WITH') ||
      trimmed.startsWith('PRAGMA')
    ) {
      const result = await bound.all();
      const rows = result.results || [];
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: sqliteText, duration, rows: rows.length });
      }

      return { rows, rowCount: rows.length };
    } else {
      const result = await bound.run();
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: sqliteText, duration });
      }

      return { rows: [], rowCount: result.meta?.changes || 0 };
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', sqliteText);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * データベース接続テスト
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT datetime('now') as now");
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * 接続プールを閉じる（D1では不要、互換性のために残す）
 */
export async function closePool(): Promise<void> {
  // D1はステートレスなので何もしない
}

/**
 * スクレイピング全体統計を取得
 */
export async function getScrapingStats() {
  const result = await query(`
    SELECT
      COUNT(*) as total_runs,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_runs,
      COALESCE(SUM(tails_found), 0) as total_tails_found,
      COALESCE(AVG(execution_time_ms), 0) as avg_execution_time,
      MAX(started_at) as last_run
    FROM scraping_logs
    WHERE started_at >= datetime('now', '-30 days')
  `);
  const row = result.rows[0];
  return {
    total_runs: parseInt(row.total_runs),
    successful_runs: parseInt(row.successful_runs),
    failed_runs: parseInt(row.failed_runs),
    total_tails_found: parseInt(row.total_tails_found),
    avg_execution_time: Math.round(parseFloat(row.avg_execution_time)),
    last_run: row.last_run,
  };
}

/**
 * 日別スクレイピング統計を取得
 */
export async function getDailyStats(days: number = 30) {
  const result = await query(
    `
    SELECT
      DATE(started_at) as date,
      COUNT(*) as runs,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
      COALESCE(SUM(tails_found), 0) as tails_found,
      COALESCE(SUM(tails_added), 0) as tails_added,
      COALESCE(SUM(tails_updated), 0) as tails_updated,
      COALESCE(SUM(tails_removed), 0) as tails_removed
    FROM scraping_logs
    WHERE started_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(started_at)
    ORDER BY date DESC
    `,
    [days]
  );
  return result.rows;
}

/**
 * スクレイピングログ一覧を取得
 */
export async function getScrapingLogs(limit: number = 50) {
  const result = await query(
    `
    SELECT
      sl.id,
      m.name as municipality_name,
      sl.started_at,
      sl.completed_at,
      sl.status,
      sl.tails_found,
      sl.tails_added,
      sl.tails_updated,
      sl.tails_removed,
      sl.error_message,
      sl.execution_time_ms
    FROM scraping_logs sl
    JOIN municipalities m ON sl.municipality_id = m.id
    ORDER BY sl.started_at DESC
    LIMIT ?
    `,
    [limit]
  );
  return result.rows;
}
