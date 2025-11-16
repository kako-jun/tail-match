import { NextRequest, NextResponse } from 'next/server'
import { getTails, getTailsStats } from '@/lib/tails'
import { TailSearchParams } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 統計情報のリクエストかチェック
    if (searchParams.get('stats') === 'true') {
      const stats = await getTailsStats()
      return NextResponse.json({ success: true, data: stats })
    }

    // 検索パラメータを構築
    const params: TailSearchParams = {
      region_id: searchParams.get('region_id') ? parseInt(searchParams.get('region_id')!) : undefined,
      municipality_id: searchParams.get('municipality_id') ? parseInt(searchParams.get('municipality_id')!) : undefined,
      animal_type: searchParams.get('animal_type') || 'cat',
      gender: searchParams.get('gender') || undefined,
      age_estimate: searchParams.get('age_estimate') || undefined,
      urgency_days: searchParams.get('urgency_days') ? parseInt(searchParams.get('urgency_days')!) : undefined,
      status: searchParams.get('status') || 'available',
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100件
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: (searchParams.get('sort_by') as any) || 'deadline_date',
      sort_order: (searchParams.get('sort_order') as any) || 'asc',
      keyword: searchParams.get('keyword') || undefined,
      personality_traits: searchParams.get('personality_traits')?.split(',') || undefined
    }

    const result = await getTails(params)
    
    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('API Error (GET /api/tails):', error)
    
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