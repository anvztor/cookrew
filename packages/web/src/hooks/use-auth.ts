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
      const resp = await fetch('/auth/me', { credentials: 'include' })
      if (resp.ok) {
        const data = await resp.json()
        const username: string | null = data.username ?? null

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
    const state = Math.random().toString(36).substring(2)
    const redirectUri = `${window.location.origin}/auth/callback`
    const url = `${KREW_AUTH_URL}/auth/login?client_id=cookrew&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code`
    window.location.href = url
  }, [])

  const claimUsername = useCallback(async (username: string) => {
    const resp = await fetch('/auth/username', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to claim username')
    }

    const data = await resp.json()
    setState(s => ({ ...s, username: data.username, needsUsername: false }))
    return data.username
  }, [])

  const logout = useCallback(async () => {
    await fetch('/auth/me', { method: 'DELETE', credentials: 'include' }).catch(() => {})
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
