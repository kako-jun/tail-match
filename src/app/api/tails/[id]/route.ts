import { NextRequest, NextResponse } from 'next/server'
import { getTailById } from '@/lib/tails'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tail ID' },
        { status: 400 }
      )
    }

    const tail = await getTailById(id)
    
    if (!tail) {
      return NextResponse.json(
        { success: false, error: 'Tail not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tail
    })

  } catch (error) {
    console.error(`API Error (GET /api/tails/${params.id}):`, error)
    
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