'use client'

import { useCallback, useEffect, useState } from 'react'

interface MintOp {
  id: string
  agent_name: string
  display_name: string
  agent_uri: string
  userop: Record<string, string>
  created_at: string
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

// EntryPoint v0.6 handleOps ABI
const HANDLE_OPS_SELECTOR = '0x1fad948c' // handleOps(UserOperation[],address)

export function MintAgentsPanel() {
  const [ops, setOps] = useState<MintOp[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const resp = await fetch('/api/mint-ops')
      if (resp.ok) setOps(await resp.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 5000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const mintAll = useCallback(async () => {
    if (!window.ethereum || ops.length === 0) return
    setLoading(true)

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const from = accounts[0]

      // For each UserOp, human calls handleOps on EntryPoint
      // In production this would batch all ops in one handleOps call
      // For MVP, submit one at a time
      for (const op of ops) {
        const { encodeFunctionData } = await import('viem')

        const handleOpsData = encodeFunctionData({
          abi: [{
            inputs: [
              {
                components: [
                  { name: 'sender', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'initCode', type: 'bytes' },
                  { name: 'callData', type: 'bytes' },
                  { name: 'callGasLimit', type: 'uint256' },
                  { name: 'verificationGasLimit', type: 'uint256' },
                  { name: 'preVerificationGas', type: 'uint256' },
                  { name: 'maxFeePerGas', type: 'uint256' },
                  { name: 'maxPriorityFeePerGas', type: 'uint256' },
                  { name: 'paymasterAndData', type: 'bytes' },
                  { name: 'signature', type: 'bytes' },
                ],
                name: 'ops',
                type: 'tuple[]',
              },
              { name: 'beneficiary', type: 'address' },
            ],
            name: 'handleOps',
            type: 'function',
          }],
          functionName: 'handleOps',
          args: [
            [{
              sender: op.userop.sender as `0x${string}`,
              nonce: BigInt(op.userop.nonce),
              initCode: op.userop.initCode as `0x${string}`,
              callData: op.userop.callData as `0x${string}`,
              callGasLimit: BigInt(op.userop.callGasLimit),
              verificationGasLimit: BigInt(op.userop.verificationGasLimit),
              preVerificationGas: BigInt(op.userop.preVerificationGas),
              maxFeePerGas: BigInt(op.userop.maxFeePerGas),
              maxPriorityFeePerGas: BigInt(op.userop.maxPriorityFeePerGas),
              paymasterAndData: op.userop.paymasterAndData as `0x${string}`,
              signature: op.userop.signature as `0x${string}`,
            }],
            from as `0x${string}`, // beneficiary = sender
          ],
        })

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6
            data: handleOpsData,
            gas: '0x200000',
          }],
        })

        // Confirm in krewauth
        await fetch('/api/mint-ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', mint_id: op.id, tx_hash: txHash }),
        })
      }

      setOps([])
    } catch (err) {
      console.error('Mint failed:', err)
    } finally {
      setLoading(false)
    }
  }, [ops])

  if (ops.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 shadow-lg">
      <p className="text-sm font-bold text-[var(--text-primary)]">
        Mint {ops.length} Agent NFT{ops.length > 1 ? 's' : ''} on GOAT Testnet3
      </p>
      <div className="mt-2 space-y-1">
        {ops.map(op => (
          <div key={op.id} className="text-xs text-[var(--text-muted)]">
            {op.display_name} → ERC-8004 Identity Registry
          </div>
        ))}
      </div>
      <button
        onClick={() => void mintAll()}
        disabled={loading}
        className="mt-3 w-full rounded-md border border-[var(--border-strong)] bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? 'Minting...' : 'Approve & Mint with Wallet'}
      </button>
    </div>
  )
}
