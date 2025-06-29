import { NextRequest, NextResponse } from 'next/server'
import { getUrgentTails } from '@/lib/tails'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // 最大50件

    const urgentTails = await getUrgentTails(limit)
    
    return NextResponse.json({
      success: true,
      data: urgentTails,
      count: urgentTails.length
    })

  } catch (error) {
    console.error('API Error (GET /api/tails/urgent):', error)
    
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