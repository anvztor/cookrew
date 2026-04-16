'use client'

import type {
  CookbookData,
  CookbookDetailData,
  CreateBundleInput,
  CreateRecipeInput,
  DecisionInput,
  DigestReviewData,
  HistoryData,
  Recipe,
  WorkspaceData,
} from '@cookrew/shared'

class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null
    throw new ApiError(body?.error ?? body?.detail ?? 'Request failed', response.status)
  }

  return (await response.json()) as T
}

export async function getCookbookData(): Promise<CookbookData> {
  return requestJson<CookbookData>('/api/v1/cookbooks-data')
}

export async function getCookbookDetailData(cookbookId: string): Promise<CookbookDetailData> {
  return requestJson<CookbookDetailData>(`/api/v1/cookbooks/${cookbookId}/detail`)
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  return requestJson<Recipe>('/api/v1/recipes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getWorkspaceData(
  recipeId: string,
  bundleId?: string | null
): Promise<WorkspaceData> {
  const search = bundleId ? `?bundle_id=${encodeURIComponent(bundleId)}` : ''
  return requestJson<WorkspaceData>(`/api/v1/recipes/${recipeId}/workspace${search}`)
}

export async function createBundle(
  recipeId: string,
  input: CreateBundleInput
): Promise<{ bundle_id: string }> {
  return requestJson<{ bundle_id: string }>(`/api/v1/recipes/${recipeId}/bundles`, {
    method: 'POST',
    body: JSON.stringify({
      prompt: input.prompt,
      requested_by: input.requested_by,
      tasks: input.task_titles.map(title => ({ title })),
    }),
  })
}

export async function getDigestReviewData(
  recipeId: string,
  bundleId: string
): Promise<DigestReviewData> {
  return requestJson<DigestReviewData>(
    `/api/v1/recipes/${recipeId}/digest-review/${bundleId}`
  )
}

export async function rerunBundle(
  _recipeId: string,
  bundleId: string
): Promise<{ bundle_id: string }> {
  return requestJson<{ bundle_id: string }>(
    `/api/v1/bundles/${bundleId}/rerun`,
    {
      method: 'POST',
    }
  )
}

/**
 * Cancel a single in-flight task (open / claimed / working). The watch
 * service emits task:cancelled so the local krewcli daemon can kill
 * the running subprocess. 400 if the task is in a terminal state.
 */
export async function cancelTask(
  taskId: string
): Promise<{ task: { id: string; status: string } }> {
  return requestJson<{ task: { id: string; status: string } }>(
    `/api/v1/tasks/${taskId}/cancel`,
    { method: 'POST' }
  )
}

export async function decideDigest(
  _recipeId: string,
  bundleId: string,
  input: DecisionInput
): Promise<{ redirect_to: string }> {
  return requestJson<{ redirect_to: string }>(
    `/api/v1/bundles/${bundleId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function getHistoryData(recipeId: string): Promise<HistoryData> {
  return requestJson<HistoryData>(`/api/v1/recipes/${recipeId}/history-data`)
}
