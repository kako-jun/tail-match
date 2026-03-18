import { NextResponse } from 'next/server';
import { testConnection, query } from '@/lib/database';

export const runtime = 'edge';

export async function GET() {
  try {
    // データベース接続テスト
    const isConnected = await testConnection();

    if (!isConnected) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // テーブル存在確認（SQLite版）
    const tablesResult = await query(`
      SELECT name as table_name
      FROM sqlite_master
      WHERE type = 'table'
      ORDER BY name
    `);

    // 簡単なデータ確認
    const regionsResult = await query('SELECT COUNT(*) as count FROM regions');
    const municipalitiesResult = await query('SELECT COUNT(*) as count FROM municipalities');
    const tailsResult = await query('SELECT COUNT(*) as count FROM tails');

    return NextResponse.json({
      status: 'success',
      message: 'Database connection and basic queries successful',
      data: {
        tables: tablesResult.rows.map((row: any) => row.table_name),
        counts: {
          regions: parseInt(regionsResult.rows[0].count),
          municipalities: parseInt(municipalitiesResult.rows[0].count),
          tails: parseInt(tailsResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    console.error('Database test error:', error);

    return NextResponse.json(
      {
        error: 'Database test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Make sure D1 database is configured correctly in wrangler.toml',
      },
      { status: 500 }
    );
  }
}
