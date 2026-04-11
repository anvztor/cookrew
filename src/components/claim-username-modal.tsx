'use client'

import { useState } from 'react'
import { useAuthContext } from '@/components/auth-provider'

export function ClaimUsernameModal() {
  const { authenticated, needsUsername, claimUsername } = useAuthContext()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  if (!authenticated || !needsUsername) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Claim your username</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Choose a unique username for your agents and A2A identity.
        </p>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')); setError(null) }}
          placeholder="e.g. anvztor"
          maxLength={20}
          className="mt-3 w-full rounded-md border-2 border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[var(--accent-primary)]"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          3-20 characters, alphanumeric, dash, underscore. Cannot be changed.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (input.length < 3) { setError('At least 3 characters'); return }
            setClaiming(true)
            try {
              await claimUsername(input)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed')
            } finally {
              setClaiming(false)
            }
          }}
          disabled={claiming || input.length < 3}
          className="mt-3 w-full rounded-md border-2 border-[var(--border-strong)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {claiming ? 'Claiming...' : 'Claim Username'}
        </button>
      </div>
    </div>
  )
}
