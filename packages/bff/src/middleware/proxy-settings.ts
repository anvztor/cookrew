import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'

export interface ProxySettings {
  readonly apiKey: string | null
  readonly baseUrl: string | null
  readonly sessionToken: string | null
}

/**
 * Derive proxy settings from Hono request context.
 * In demo mode (cookrew_mode=demo cookie), returns null settings.
 * Otherwise reads the environment variables and the session JWT.
 */
export function getProxySettingsFromContext(c: Context): ProxySettings {
  const mode = getCookie(c, 'cookrew_mode')

  if (mode === 'demo') {
    return {
      apiKey: null,
      baseUrl: null,
      sessionToken: null,
    }
  }

  const sessionToken =
    getCookie(c, 'krew_session') ??
    getCookie(c, 'krewhub_session') ??
    null

  return {
    apiKey: process.env.KREWHUB_API_KEY ?? null,
    baseUrl: process.env.KREWHUB_BASE_URL ?? null,
    sessionToken,
  }
}

/**
 * Hono middleware that attaches ProxySettings to context variables.
 * Access via `c.get('proxySettings')` in route handlers.
 */
export const proxySettingsMiddleware: MiddlewareHandler = async (c, next) => {
  c.set('proxySettings', getProxySettingsFromContext(c))
  await next()
}
