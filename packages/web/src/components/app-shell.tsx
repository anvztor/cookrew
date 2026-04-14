'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/auth-provider'
import { AppHeader } from '@/components/app-header'
import { ClaimUsernameModal } from '@/components/claim-username-modal'

export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans text-text-primary">
        <AppHeader />
        {children}
        <ClaimUsernameModal />
      </div>
    </AuthProvider>
  )
}
