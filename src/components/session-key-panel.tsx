'use client'

import { useCallback, useEffect, useState } from 'react'

interface PendingRequest {
  id: string
  agent_name: string
  session_pubkey: string
  allowed_targets: string[]
  allowed_selectors: string[]
  spend_limit: string
  valid_hours: number
  created_at: string
}

interface SessionKeyPanelProps {
  smartAccountAddress: string | null
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

export function SessionKeyPanel({ smartAccountAddress }: SessionKeyPanelProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const resp = await fetch('/api/session-keys')
      if (resp.ok) setRequests(await resp.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 5000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const approve = useCallback(async (req: PendingRequest) => {
    if (!smartAccountAddress || !window.ethereum) return
    setLoading(true)

    try {
      const validUntil = Math.floor(Date.now() / 1000) + req.valid_hours * 3600

      // Encode addSessionKey calldata with viem
      const { encodeFunctionData } = await import('viem')
      const calldata = encodeFunctionData({
        abi: [{
          inputs: [
            { name: 'key', type: 'address' },
            { name: 'allowedTargets_', type: 'address[]' },
            { name: 'allowedSelectors_', type: 'bytes4[]' },
            { name: 'validUntil_', type: 'uint48' },
            { name: 'spendLimit_', type: 'uint128' },
          ],
          name: 'addSessionKey',
          type: 'function',
        }],
        functionName: 'addSessionKey',
        args: [
          req.session_pubkey as `0x${string}`,
          req.allowed_targets as `0x${string}`[],
          req.allowed_selectors as `0x${string}`[],
          validUntil,
          BigInt(req.spend_limit),
        ],
      })

      // Human signs with their wallet (MetaMask/Vultisig)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: smartAccountAddress,
          data: calldata,
        }],
      })

      // Confirm in krewauth
      await fetch('/api/session-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', request_id: req.id }),
      })

      setRequests(prev => prev.filter(r => r.id !== req.id))
    } catch (err) {
      console.error('Approval failed:', err)
    } finally {
      setLoading(false)
    }
  }, [smartAccountAddress])

  const reject = useCallback(async (req: PendingRequest) => {
    await fetch('/api/session-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', request_id: req.id }),
    })
    setRequests(prev => prev.filter(r => r.id !== req.id))
  }, [])

  if (requests.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 space-y-2">
      {requests.map(req => (
        <div key={req.id} className="rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 shadow-lg">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Agent &quot;{req.agent_name}&quot; requests access
          </p>
          <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
            <p>Key: {req.session_pubkey.slice(0, 10)}...{req.session_pubkey.slice(-6)}</p>
            <p>Scope: register() on ERC-8004</p>
            <p>Duration: {req.valid_hours}h</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void approve(req)}
              disabled={loading}
              className="flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {loading ? 'Signing...' : 'Approve'}
            </button>
            <button
              onClick={() => void reject(req)}
              className="flex-1 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
