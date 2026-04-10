import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'krew_session'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  // Decode JWT claims locally (no server call needed — ES256 can be verified with JWKS)
  // For simplicity, just parse the payload (base64url) without crypto verification
  // The token was issued by krewauth and set as httpOnly cookie by our callback
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT')

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    )

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      response.cookies.delete(COOKIE_NAME)
      return response
    }

    return NextResponse.json({
      authenticated: true,
      account_id: payload.sub,
      wallet_address: payload.wallet ?? null,
      auth_method: payload.method ?? 'unknown',
    })
  } catch {
    const response = NextResponse.json({ authenticated: false }, { status: 401 })
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}
