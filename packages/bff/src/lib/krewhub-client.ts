import type { ProxySettings } from '../middleware/proxy-settings'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const

export class KrewHubRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'KrewHubRequestError'
    this.status = status
  }
}

export async function readKrewHubError(response: Response): Promise<string> {
  const detail = await response.text()
  if (!detail) {
    return `KrewHub request failed with ${response.status}`
  }

  try {
    const parsed = JSON.parse(detail) as { detail?: string; error?: string }
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail
    }
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error
    }
  } catch {
    // Fall back to the raw body for non-JSON upstream errors.
  }

  return detail
}

export async function nullOnNotFound<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof KrewHubRequestError && error.status === 404) {
      return null
    }

    throw error
  }
}

export function getApiRouteError(
  error: unknown,
  fallbackMessage: string
): { readonly error: string; readonly status: number } {
  if (error instanceof KrewHubRequestError) {
    return {
      error: error.message,
      status: error.status,
    }
  }

  return {
    error: error instanceof Error ? error.message : fallbackMessage,
    status: 500,
  }
}

function getDefaultProxySettings(): ProxySettings {
  return {
    apiKey: process.env.KREWHUB_API_KEY ?? null,
    baseUrl: process.env.KREWHUB_BASE_URL ?? null,
    sessionToken: null,
  }
}

export function hasKrewHubProxy(
  proxySettings: ProxySettings = getDefaultProxySettings()
): boolean {
  return Boolean(proxySettings.baseUrl)
}

export async function requestKrewHub<T>(
  path: string,
  init?: RequestInit,
  proxySettings: ProxySettings = getDefaultProxySettings()
): Promise<T> {
  const baseUrl = proxySettings.baseUrl
  if (!baseUrl) {
    throw new Error('KREWHUB_BASE_URL is not configured')
  }

  // Prefer JWT session token over legacy API key
  const authHeaders: Record<string, string> = proxySettings.sessionToken
    ? { Authorization: `Bearer ${proxySettings.sessionToken}` }
    : proxySettings.apiKey
      ? { 'X-API-Key': proxySettings.apiKey }
      : {}

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new KrewHubRequestError(
      await readKrewHubError(response),
      response.status
    )
  }

  return (await response.json()) as T
}
