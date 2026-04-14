import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'

const COOKIE_NAME = 'krew_session'

/**
 * Read the session JWT from the krew_session cookie.
 * Returns null if no token is present.
 */
export function getSessionToken(c: Context): string | null {
  return getCookie(c, COOKIE_NAME) ?? null
}

/**
 * Decode JWT claims locally without crypto verification.
 * The token was issued by krewauth and set as httpOnly cookie by our callback.
 * Returns null if the token is invalid or expired.
 */
export function decodeSessionClaims(
  token: string
): {
  readonly sub: string
  readonly wallet: string | null
  readonly method: string
  readonly username: string | null
  readonly exp: number
} | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString()
    )

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null
    }

    return {
      sub: payload.sub,
      wallet: payload.wallet ?? null,
      method: payload.method ?? 'unknown',
      username: payload.username ?? null,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}
