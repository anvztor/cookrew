import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getProxySettingsFromRequest,
  getDigestReviewData,
} from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string; bundleId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { recipeId, bundleId } = await context.params
    const data = await getDigestReviewData(
      recipeId,
      bundleId,
      getProxySettingsFromRequest(_request)
    )

    if (!data) {
      return NextResponse.json(
        { error: 'Digest review was not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load digest review')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
