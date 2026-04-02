import { NextResponse } from 'next/server'
import { planTasksFromPrompt } from '@/lib/server/task-planner'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

/**
 * POST /api/recipes/[recipeId]/plan
 *
 * Decomposes a prompt into tasks with dependencies.
 * Uses the local heuristic planner. When an orchestrator agent
 * is online, the plan route can forward to it via A2A.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
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
