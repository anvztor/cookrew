'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AuthState {
  readonly authenticated: boolean
  readonly loading: boolean
  readonly accountId: string | null
  readonly username: string | null
  readonly walletAddress: string | null
  readonly authMethod: string | null
  readonly needsUsername: boolean
}

const INITIAL_STATE: AuthState = {
  authenticated: false,
  loading: true,
  accountId: null,
  username: null,
  walletAddress: null,
  authMethod: null,
  needsUsername: false,
}

const KREW_AUTH_URL = process.env.NEXT_PUBLIC_KREW_AUTH_URL ?? 'http://localhost:8421'

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const resp = await fetch('/api/auth/me')
      if (resp.ok) {
        const data = await resp.json()
        // Extract username from JWT payload
        let username: string | null = null
        try {
          const cookieStr = document.cookie
          const match = cookieStr.split(';').find(c => c.trim().startsWith('krew_session='))
          if (match) {
            const token = match.split('=').slice(1).join('=')
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
            username = payload.username || null
          }
        } catch { /* ignore */ }

        setState({
          authenticated: true,
          loading: false,
          accountId: data.account_id,
          username,
          walletAddress: data.wallet_address,
          authMethod: data.auth_method,
          needsUsername: !username,
        })
      } else {
        setState({ ...INITIAL_STATE, loading: false })
      }
    } catch {
      setState({ ...INITIAL_STATE, loading: false })
    }
  }, [])

  const login = useCallback(() => {
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2)
    const redirectUri = `${window.location.origin}/auth/callback`
    const url = `${KREW_AUTH_URL}/auth/login?client_id=cookrew&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code`
    window.location.href = url
  }, [])

  const claimUsername = useCallback(async (username: string) => {
    // Get current token from cookie
    const match = document.cookie.split(';').find(c => c.trim().startsWith('krew_session='))
    if (!match) throw new Error('Not logged in')
    const token = match.split('=').slice(1).join('=')

    const resp = await fetch(`${KREW_AUTH_URL}/auth/username/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to claim username')
    }

    const data = await resp.json()
    // Update cookie with new JWT that has username
    document.cookie = `krew_session=${data.token}; path=/; max-age=86400; SameSite=Lax`
    setState(s => ({ ...s, username: data.username, needsUsername: false }))
    return data.username
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE' }).catch(() => {})
    document.cookie = 'krew_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setState({ ...INITIAL_STATE, loading: false })
  }, [])

  return {
    ...state,
    login,
    logout,
    claimUsername,
    checkSession,
  }
}
