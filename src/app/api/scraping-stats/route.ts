import { NextRequest, NextResponse } from 'next/server'
import { getScrapingStats, getDailyStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const days = parseInt(searchParams.get('days') || '30')
    
    if (type === 'daily') {
      const dailyStats = await getDailyStats(days)
      return NextResponse.json({
        success: true,
        data: dailyStats
      })
    }
    
    const stats = await getScrapingStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Failed to fetch scraping stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scraping stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}