import { NextResponse } from 'next/server'
import { createBundle } from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { recipeId } = await context.params
    const body = (await request.json()) as {
      prompt?: string
      requestedBy?: string
      taskTitles?: string[]
    }

    if (!body.prompt?.trim() || !body.requestedBy?.trim()) {
      return NextResponse.json(
        { error: 'Prompt and requester are required.' },
        { status: 400 }
      )
    }

    const result = await createBundle(recipeId, {
      prompt: body.prompt.trim(),
      requestedBy: body.requestedBy.trim(),
      taskTitles: body.taskTitles ?? [],
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create bundle' },
      { status: 500 }
    )
  }
}
