import { NextResponse } from 'next/server'
import { testConnection, query } from '@/lib/database'

export async function GET() {
  try {
    // データベース接続テスト
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // テーブル存在確認
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    // 簡単なデータ確認
    const regionsResult = await query('SELECT COUNT(*) as count FROM regions')
    const municipalitiesResult = await query('SELECT COUNT(*) as count FROM municipalities')
    const tailsResult = await query('SELECT COUNT(*) as count FROM tails')

    return NextResponse.json({
      status: 'success',
      message: 'Database connection and basic queries successful',
      data: {
        tables: tablesResult.rows.map((row: any) => row.table_name),
        counts: {
          regions: parseInt(regionsResult.rows[0].count),
          municipalities: parseInt(municipalitiesResult.rows[0].count),
          tails: parseInt(tailsResult.rows[0].count)
        }
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    
    return NextResponse.json(
      { 
        error: 'Database test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Make sure PostgreSQL is running and environment variables are set correctly'
      },
      { status: 500 }
    )
  }
}