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
