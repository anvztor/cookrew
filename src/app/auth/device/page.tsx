'use client'

import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

export default function DeviceAuthPage() {
  const { authenticated, walletAddress } = useAuth()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'approving' | 'approved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    if (!code.trim()) return

    setStatus('approving')
    setError(null)

    try {
      const resp = await fetch('/api/auth/device-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code.trim().toUpperCase() }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail ?? 'Approval failed')
      }

      setStatus('approved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed')
      setStatus('error')
    }
  }

  if (!authenticated) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-full max-w-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Connect Wallet First
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Go to the home page and click &quot;Connect Wallet&quot; before approving a device.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Authorize CLI
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Enter the code shown by <code className="rounded bg-[var(--bg-muted)] px-1 text-xs">krewcli login</code>
          </p>
        </div>

        <div className="text-center text-xs text-[var(--text-muted)]">
          Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </div>

        {status === 'approved' ? (
          <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-800">
            Approved. Your CLI is now logged in.
          </div>
        ) : (
          <>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              maxLength={9}
              className="w-full rounded-md border-2 border-[var(--border-subtle)] bg-white px-4 py-3 text-center text-lg font-mono tracking-widest text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />

            <button
              onClick={handleApprove}
              disabled={status === 'approving' || code.trim().length < 8}
              className="w-full rounded-md border-2 border-[var(--border-strong)] bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-primary-light)] disabled:opacity-50"
            >
              {status === 'approving' ? 'Approving...' : 'Approve'}
            </button>
          </>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
