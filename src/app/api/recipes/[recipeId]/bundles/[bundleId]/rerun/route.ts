import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getProxySettingsFromRequest,
  rerunBundle,
} from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string; bundleId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { recipeId, bundleId } = await context.params
    const updated = await rerunBundle(
      recipeId,
      bundleId,
      getProxySettingsFromRequest(request)
    )

    if (!updated) {
      return NextResponse.json(
        { error: 'No blocked tasks are available to rerun.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ bundleId: updated.bundle.id })
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to re-run blocked tasks')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
