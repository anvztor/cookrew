'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/components/auth-provider'
import { AppHeader } from '@/components/app-header'
import { ClaimUsernameModal } from '@/components/claim-username-modal'

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname()
  // The Arcade surfaces own their own full-viewport chrome
  // (TopHUD / ApTopBar) and render edge-to-edge. Skip the global
  // AppHeader on:
  //   /                           (ArcadeHome)
  //   /recipes/[id]               (ArcadeWorkspace)
  // History / digest / auth pages still get AppHeader.
  const p = pathname ?? ''
  const isArcade =
    p === '/' || /^\/recipes\/[^/]+\/?$/.test(p)

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans text-text-primary">
        {!isArcade && <AppHeader />}
        {children}
        <ClaimUsernameModal />
      </div>
    </AuthProvider>
  )
}
