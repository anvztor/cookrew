'use client'

import type {
  CookbookData,
  CreateBundleInput,
  CreateRecipeInput,
  DecisionInput,
  DigestReviewData,
  HistoryData,
  Recipe,
  WorkspaceData,
} from '@/types'

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
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new ApiError(body?.error ?? 'Request failed', response.status)
  }

  return (await response.json()) as T
}

export async function getCookbookData(): Promise<CookbookData> {
  return requestJson<CookbookData>('/api/recipes')
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  return requestJson<Recipe>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getWorkspaceData(
  recipeId: string,
  bundleId?: string | null
): Promise<WorkspaceData> {
  const search = bundleId ? `?bundleId=${encodeURIComponent(bundleId)}` : ''
  return requestJson<WorkspaceData>(`/api/recipes/${recipeId}${search}`)
}

export async function createBundle(
  recipeId: string,
  input: CreateBundleInput
): Promise<{ bundleId: string }> {
  return requestJson<{ bundleId: string }>(`/api/recipes/${recipeId}/bundles`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getDigestReviewData(
  recipeId: string,
  bundleId: string
): Promise<DigestReviewData> {
  return requestJson<DigestReviewData>(
    `/api/recipes/${recipeId}/bundles/${bundleId}/digest`
  )
}

export async function runDigest(
  recipeId: string,
  bundleId: string
): Promise<{ redirectTo: string }> {
  return requestJson<{ redirectTo: string }>(
    `/api/recipes/${recipeId}/bundles/${bundleId}/digest`,
    {
      method: 'POST',
    }
  )
}

export async function rerunBundle(
  recipeId: string,
  bundleId: string
): Promise<{ bundleId: string }> {
  return requestJson<{ bundleId: string }>(
    `/api/recipes/${recipeId}/bundles/${bundleId}/rerun`,
    {
      method: 'POST',
    }
  )
}

export async function decideDigest(
  recipeId: string,
  bundleId: string,
  input: DecisionInput
): Promise<{ redirectTo: string }> {
  return requestJson<{ redirectTo: string }>(
    `/api/recipes/${recipeId}/bundles/${bundleId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function getHistoryData(recipeId: string): Promise<HistoryData> {
  return requestJson<HistoryData>(`/api/recipes/${recipeId}/history`)
}

export { ApiError }
