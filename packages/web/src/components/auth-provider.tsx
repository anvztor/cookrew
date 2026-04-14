'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useAuth, type AuthState } from '@/hooks/use-auth'

interface AuthContextValue extends AuthState {
  readonly login: () => void
  readonly logout: () => Promise<void>
  readonly claimUsername: (username: string) => Promise<string>
  readonly checkSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
