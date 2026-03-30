import { NextResponse } from 'next/server'
import { getWorkspaceData } from '@/lib/server/cookrew-data'

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load workspace' },
      { status: 500 }
    )
  }
}
