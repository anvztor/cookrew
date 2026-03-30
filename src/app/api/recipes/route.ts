import { NextResponse } from 'next/server'
import {
  createRecipe,
  getApiRouteError,
  getProxySettingsFromRequest,
  listCookbookData,
} from '@/lib/server/cookrew-data'

export async function GET(request: Request) {
  try {
    const data = await listCookbookData(getProxySettingsFromRequest(request))
    return NextResponse.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load recipes')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}

export async function POST(request: Request) {
  try {
    const proxySettings = getProxySettingsFromRequest(request)
    const body = (await request.json()) as {
      name?: string
      repoUrl?: string
      defaultBranch?: string
      createdBy?: string
    }

    if (!body.name?.trim() || !body.repoUrl?.trim() || !body.createdBy?.trim()) {
      return NextResponse.json(
        { error: 'Name, repository URL, and creator are required.' },
        { status: 400 }
      )
    }

    const recipe = await createRecipe({
      name: body.name.trim(),
      repoUrl: body.repoUrl.trim(),
      defaultBranch: body.defaultBranch?.trim() || 'main',
      createdBy: body.createdBy.trim(),
    }, proxySettings)

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to create recipe')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}
