'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AuthState {
  readonly authenticated: boolean
  readonly loading: boolean
  readonly accountId: string | null
  readonly walletAddress: string | null
  readonly authMethod: string | null
}

const INITIAL_STATE: AuthState = {
  authenticated: false,
  loading: true,
  accountId: null,
  walletAddress: null,
  authMethod: null,
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
        setState({
          authenticated: true,
          loading: false,
          accountId: data.account_id,
          walletAddress: data.wallet_address,
          authMethod: data.auth_method,
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

  const logout = useCallback(async () => {
    // Clear local cookie
    await fetch('/api/auth/me', { method: 'DELETE' }).catch(() => {})
    // Clear cookie by setting expired
    document.cookie = 'krew_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setState({ ...INITIAL_STATE, loading: false })
  }, [])

  return {
    ...state,
    login,
    logout,
    checkSession,
  }
}
