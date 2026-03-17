import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // scraping_logs の status 値は 'success' / 'error' / 'warning'
    // (旧コードの 'completed' / 'failed' は実際のスキーマと不一致だったため修正)
    const statsQuery = `
      SELECT
        COUNT(*) as total_runs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_runs,
        COALESCE(SUM(tails_found), 0) as total_cats_found,
        COALESCE(AVG(execution_time_ms), 0) as avg_execution_time,
        MAX(started_at) as last_run
      FROM scraping_logs
      WHERE started_at >= NOW() - INTERVAL '30 days'
    `

    const result = await query(statsQuery)
    const stats = result.rows[0]

    const response = {
      total_runs: parseInt(stats.total_runs),
      successful_runs: parseInt(stats.successful_runs),
      failed_runs: parseInt(stats.failed_runs),
      total_cats_found: parseInt(stats.total_cats_found),
      avg_execution_time: Math.round(parseFloat(stats.avg_execution_time)),
      last_run: stats.last_run
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching scraping stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraping stats' },
      { status: 500 }
    )
  }
}