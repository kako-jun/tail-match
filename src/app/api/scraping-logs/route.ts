import { NextRequest, NextResponse } from 'next/server'
import { getScrapingLogs } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const logs = await getScrapingLogs(limit)
    
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length
    })
  } catch (error) {
    console.error('Failed to fetch scraping logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scraping logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}