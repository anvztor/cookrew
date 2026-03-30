import { NextResponse } from 'next/server'
import { getHistoryData } from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { recipeId } = await context.params
    const data = await getHistoryData(recipeId)

    if (!data) {
      return NextResponse.json(
        { error: 'Approved digest history was not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load history' },
      { status: 500 }
    )
  }
}
