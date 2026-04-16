'use client'

import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { useAuthContext } from '@/components/auth-provider'
import { CokrewIcon } from '@/components/cookrew-logo'

export function AppHeader() {
  const {
    authenticated,
    loading: authLoading,
    walletAddress,
    accountId,
    username,
    login,
    logout,
  } = useAuthContext()

  return (
    <header className="flex items-center justify-between border-b border-border-strong bg-bg-surface px-4 sm:px-6 py-3 sm:py-4">
      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <CokrewIcon size={28} />
        <span className="text-[18px] sm:text-[20px] font-extrabold tracking-[2px] text-text-primary">
          COOKREW
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {authenticated ? (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary">
              <User size={16} className="text-text-primary" />
            </div>
            <span className="hidden sm:inline text-[14px] font-medium text-text-primary">
              {username
                ? `@${username}`
                : walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : accountId?.slice(0, 12) ?? 'Account'}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#f0ece4] transition-colors"
              title="Sign out"
            >
              <LogOut size={18} className="text-[#78716C]" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={authLoading}
            className="flex items-center gap-2 border-2 border-border-strong bg-accent-primary px-3 sm:px-4 py-2 text-[13px] sm:text-[14px] font-bold uppercase tracking-[1px] text-text-primary shadow-[3px_3px_0_#2D2A20] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#2D2A20] disabled:opacity-50"
          >
            {authLoading ? 'Loading...' : 'Sign in'}
          </button>
        )}
      </div>
    </header>
  )
}
