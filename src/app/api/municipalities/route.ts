import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const regionId = searchParams.get('region_id')

    let municipalitiesQuery = `
      SELECT 
        m.*,
        r.name as region_name,
        r.code as region_code,
        COUNT(t.id) FILTER (WHERE t.status = 'available') as available_tails_count
      FROM municipalities m
      JOIN regions r ON m.region_id = r.id
      LEFT JOIN tails t ON m.id = t.municipality_id AND t.status = 'available'
      WHERE m.is_active = true
    `
    
    const queryParams: any[] = []
    
    if (regionId) {
      municipalitiesQuery += ` AND m.region_id = $1`
      queryParams.push(parseInt(regionId))
    }
    
    municipalitiesQuery += `
      GROUP BY m.id, m.region_id, m.name, m.municipality_type, m.website_url, 
               m.contact_info, m.scraping_config, m.is_active, m.created_at, m.updated_at,
               r.name, r.code
      ORDER BY r.code, m.name
    `

    const result = await query(municipalitiesQuery, queryParams)
    
    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        region_id: row.region_id,
        name: row.name,
        municipality_type: row.municipality_type,
        website_url: row.website_url,
        contact_info: row.contact_info,
        available_tails_count: parseInt(row.available_tails_count),
        region: {
          name: row.region_name,
          code: row.region_code
        },
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    })

  } catch (error) {
    console.error('API Error (GET /api/municipalities):', error)
    
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