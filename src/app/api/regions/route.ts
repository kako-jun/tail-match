import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const runtime = 'edge';

export async function GET() {
  try {
    const regionsQuery = `
      SELECT
        r.*,
        COUNT(DISTINCT m.id) as municipality_count,
        SUM(CASE WHEN t.status = 'available' THEN 1 ELSE 0 END) as available_tails_count
      FROM regions r
      LEFT JOIN municipalities m ON r.id = m.region_id AND m.is_active = 1
      LEFT JOIN tails t ON m.id = t.municipality_id AND t.status = 'available'
      GROUP BY r.id, r.name, r.code, r.type, r.created_at
      ORDER BY r.code
    `;

    const result = await query(regionsQuery);

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        municipality_count: parseInt(row.municipality_count) || 0,
        available_tails_count: parseInt(row.available_tails_count) || 0,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    console.error('API Error (GET /api/regions):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
