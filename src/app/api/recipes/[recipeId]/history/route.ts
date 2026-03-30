import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getHistoryData,
  getProxySettingsFromRequest,
} from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { recipeId } = await context.params
    const data = await getHistoryData(
      recipeId,
      getProxySettingsFromRequest(_request)
    )

    if (!data) {
      return NextResponse.json(
        { error: 'Approved digest history was not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load history')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
