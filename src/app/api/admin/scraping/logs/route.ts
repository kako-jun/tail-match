import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect()
    
    try {
      const query = `
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
        LIMIT 50
      `
      
      const result = await client.query(query)
      
      return NextResponse.json(result.rows)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching scraping logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraping logs' },
      { status: 500 }
    )
  }
}