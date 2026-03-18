import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const runtime = 'edge';

function checkAdminAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_runs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_runs,
        COALESCE(SUM(tails_found), 0) as total_cats_found,
        COALESCE(AVG(execution_time_ms), 0) as avg_execution_time,
        MAX(started_at) as last_run
      FROM scraping_logs
      WHERE started_at >= datetime('now', '-30 days')
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    const response = {
      total_runs: parseInt(stats.total_runs),
      successful_runs: parseInt(stats.successful_runs),
      failed_runs: parseInt(stats.failed_runs),
      total_cats_found: parseInt(stats.total_cats_found),
      avg_execution_time: Math.round(parseFloat(stats.avg_execution_time)),
      last_run: stats.last_run,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching scraping stats:', error);
    return NextResponse.json({ error: 'Failed to fetch scraping stats' }, { status: 500 });
  }
}
