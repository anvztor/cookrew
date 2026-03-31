import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getProxySettingsFromRequest,
  getDigestReviewData,
  submitDigest,
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { recipeId, bundleId } = await context.params
    const digest = await submitDigest(
      recipeId,
      bundleId,
      getProxySettingsFromRequest(request)
    )

    if (!digest) {
      return NextResponse.json(
        { error: 'Bundle was not found for this recipe.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      redirectTo: `/recipes/${recipeId}/bundles/${bundleId}/digest`,
    })
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to run digest')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
