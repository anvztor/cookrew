import { NextResponse } from 'next/server'
import { getDigestReviewData } from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string; bundleId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { recipeId, bundleId } = await context.params
    const data = await getDigestReviewData(recipeId, bundleId)

    if (!data) {
      return NextResponse.json(
        { error: 'Digest review was not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load digest review' },
      { status: 500 }
    )
  }
}
