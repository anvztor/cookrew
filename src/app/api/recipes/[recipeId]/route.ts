import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getWorkspaceData,
} from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { recipeId } = await context.params
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get('bundleId')

    const data = await getWorkspaceData(recipeId, bundleId)
    if (!data) {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load workspace')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
