import { NextResponse } from 'next/server'
import {
  getProxySettingsFromRequest,
  hasKrewHubProxy,
  type ProxySettings,
} from '@/lib/server/cookrew-data'
import { planTasksFromPrompt } from '@/lib/server/task-planner'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

/**
 * POST /api/recipes/[recipeId]/plan
 *
 * Decomposes a prompt into tasks with dependencies.
 * When krewhub is connected AND an agent with planning capability
 * is online, forwards to krewhub → agent → LLM (real call).
 * Falls back to local heuristic planner otherwise.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { recipeId } = await context.params
    const proxySettings = getProxySettingsFromRequest(request)
    const body = (await request.json()) as { prompt?: string }

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required.' },
        { status: 400 }
      )
    }

    const prompt = body.prompt.trim()

    // Try real LLM planning via krewhub → agent
    if (hasKrewHubProxy(proxySettings)) {
      try {
        const tasks = await planViaKrewHub(recipeId, prompt, proxySettings)
        if (tasks) {
          return NextResponse.json({ tasks })
        }
      } catch {
        // Fall through to local planner
      }
    }

    // Fallback: local heuristic planner
    const tasks = planTasksFromPrompt(prompt)
    return NextResponse.json({ tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Planning failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function planViaKrewHub(
  recipeId: string,
  prompt: string,
  proxySettings: ProxySettings
): Promise<Array<{ title: string; description: string; dependsOn: number[] }> | null> {
  const baseUrl = proxySettings.baseUrl
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (proxySettings.apiKey) {
    headers['X-API-Key'] = proxySettings.apiKey
  }

  const resp = await fetch(`${baseUrl}/api/v1/plan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, recipe_id: recipeId }),
    cache: 'no-store',
  })

  if (!resp.ok) {
    return null
  }

  const data = (await resp.json()) as {
    tasks?: Array<{ title: string; description?: string; dependsOn?: number[] }>
  }

  if (!data.tasks?.length) {
    return null
  }

  return data.tasks.map((t) => ({
    title: t.title,
    description: t.description ?? '',
    dependsOn: t.dependsOn ?? [],
  }))
}
