import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect()
    
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_runs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
          COALESCE(SUM(tails_found), 0) as total_cats_found,
          COALESCE(AVG(execution_time_ms), 0) as avg_execution_time,
          MAX(started_at) as last_run
        FROM scraping_logs
        WHERE started_at >= NOW() - INTERVAL '30 days'
      `
      
      const result = await client.query(statsQuery)
      const stats = result.rows[0]
      
      // Convert numeric strings to numbers
      const response = {
        total_runs: parseInt(stats.total_runs),
        successful_runs: parseInt(stats.successful_runs),
        failed_runs: parseInt(stats.failed_runs),
        total_cats_found: parseInt(stats.total_cats_found),
        avg_execution_time: Math.round(parseFloat(stats.avg_execution_time)),
        last_run: stats.last_run
      }
      
      return NextResponse.json(response)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching scraping stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraping stats' },
      { status: 500 }
    )
  }
}