import { Pool, QueryResult } from 'pg'

// PostgreSQL接続プール
let pool: Pool | null = null

/**
 * データベース接続プールを取得
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // 最大接続数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // エラーハンドリング
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err)
    })
  }

  return pool
}

/**
 * SQLクエリを実行
 */
export async function query(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  const pool = getPool()
  const start = Date.now()

  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start

    // ログ出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount })
    }

    return result
  } catch (error) {
    console.error('Database query error:', error)
    console.error('Query:', text)
    console.error('Params:', params)
    throw error
  }
}

/**
 * データベース接続テスト
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()')
    return result.rows.length > 0
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

/**
 * 接続プールを閉じる（アプリケーション終了時）
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
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
    WHERE started_at >= NOW() - INTERVAL '30 days'
  `)
  const row = result.rows[0]
  return {
    total_runs: parseInt(row.total_runs),
    successful_runs: parseInt(row.successful_runs),
    failed_runs: parseInt(row.failed_runs),
    total_tails_found: parseInt(row.total_tails_found),
    avg_execution_time: Math.round(parseFloat(row.avg_execution_time)),
    last_run: row.last_run,
  }
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
    WHERE started_at >= NOW() - ($1 * INTERVAL '1 day')
    GROUP BY DATE(started_at)
    ORDER BY date DESC
    `,
    [days]
  )
  return result.rows
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
    LIMIT $1
    `,
    [limit]
  )
  return result.rows
}
