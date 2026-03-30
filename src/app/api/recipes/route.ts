import { NextResponse } from 'next/server'
import {
  createRecipe,
  listCookbookData,
} from '@/lib/server/cookrew-data'

export async function GET() {
  try {
    const data = await listCookbookData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load recipes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create recipe' },
      { status: 500 }
    )
  }
}
