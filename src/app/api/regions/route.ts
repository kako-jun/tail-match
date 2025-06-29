import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    const regionsQuery = `
      SELECT 
        r.*,
        COUNT(m.id) as municipality_count,
        COUNT(t.id) FILTER (WHERE t.status = 'available') as available_tails_count
      FROM regions r
      LEFT JOIN municipalities m ON r.id = m.region_id AND m.is_active = true
      LEFT JOIN tails t ON m.id = t.municipality_id AND t.status = 'available'
      GROUP BY r.id, r.name, r.code, r.type, r.created_at
      ORDER BY r.code
    `

    const result = await query(regionsQuery)
    
    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        municipality_count: parseInt(row.municipality_count),
        available_tails_count: parseInt(row.available_tails_count),
        created_at: row.created_at
      }))
    })

  } catch (error) {
    console.error('API Error (GET /api/regions):', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}