import { NextResponse } from 'next/server'
import { planTasksFromPrompt } from '@/lib/server/task-planner'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

/**
 * POST /api/recipes/[recipeId]/plan
 *
 * Returns a local heuristic task decomposition for preview purposes.
 * When krewhub is connected, actual planning is handled by the
 * orchestrator agent — this endpoint is only used for demo mode.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    await context.params
    const body = (await request.json()) as { prompt?: string }

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required.' },
        { status: 400 }
      )
    }

    const tasks = planTasksFromPrompt(body.prompt.trim())
    return NextResponse.json({ tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Planning failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
