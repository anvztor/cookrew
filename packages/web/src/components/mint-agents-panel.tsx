'use client'

import { useCallback, useEffect, useState } from 'react'

interface MintOp {
  id: string
  agent_name: string
  display_name: string
  agent_uri: string
  smart_account: string
  userop: Record<string, string>
  created_at: string
}

const ENTRYPOINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

export function MintAgentsPanel() {
  const [ops, setOps] = useState<MintOp[]>([])
  const [minting, setMinting] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const resp = await fetch('/api/v1/mint-ops', { credentials: 'include' })
      if (resp.ok) setOps(await resp.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 5000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const mintOne = useCallback(async (op: MintOp) => {
    if (!window.ethereum) return
    setMinting(op.id)

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const from = accounts[0]

      // Sign the UserOp with owner key (EIP-191 personal_sign over userOpHash)
      // For now, we submit the UserOp directly via handleOps
      // The signature is 0x00 || owner_ecdsa_sig (66 bytes)

      const { encodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters } = await import('viem')

      // Pack UserOp for hashing (ERC-4337 v0.6 format)
      const packed = encodeAbiParameters(
        parseAbiParameters('address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32'),
        [
          op.userop.sender as `0x${string}`,
          BigInt(op.userop.nonce),
          keccak256(op.userop.initCode as `0x${string}`),
          keccak256(op.userop.callData as `0x${string}`),
          BigInt(op.userop.callGasLimit),
          BigInt(op.userop.verificationGasLimit),
          BigInt(op.userop.preVerificationGas),
          BigInt(op.userop.maxFeePerGas),
          BigInt(op.userop.maxPriorityFeePerGas),
          keccak256(op.userop.paymasterAndData as `0x${string}`),
        ]
      )
      const userOpHash = keccak256(
        encodeAbiParameters(
          parseAbiParameters('bytes32, address, uint256'),
          [keccak256(packed), ENTRYPOINT as `0x${string}`, BigInt(48816)]
        )
      )

      // Owner signs the hash (personal_sign adds EIP-191 prefix)
      const ownerSig = await window.ethereum.request({
        method: 'personal_sign',
        params: [userOpHash, from],
      }) as string

      // Prepend 0x00 type byte for owner signature
      const signature = '0x00' + ownerSig.slice(2)

      // Build handleOps calldata
      const handleOpsData = encodeFunctionData({
        abi: [{
          inputs: [
            { components: [
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
            ], name: 'ops', type: 'tuple[]' },
            { name: 'beneficiary', type: 'address' },
          ],
          name: 'handleOps',
          type: 'function',
        }],
        functionName: 'handleOps',
        args: [[{
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
          signature: signature as `0x${string}`,
        }], from as `0x${string}`],
      })

      // Submit to EntryPoint
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: ENTRYPOINT, data: handleOpsData, gas: '0x300000' }],
      })

      // Confirm in krewauth
      await fetch('/api/v1/mint-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'confirm', mint_id: op.id, tx_hash: txHash }),
      })

      setOps(prev => prev.filter(o => o.id !== op.id))
    } catch (err) {
      console.error('Mint failed:', err)
    } finally {
      setMinting(null)
    }
  }, [])

  if (ops.length === 0) return null

  return (
    <div className="space-y-2">
      {ops.map(op => (
        <div key={op.id} className="flex items-center justify-between rounded border border-amber-400 bg-amber-50 p-3">
          <div>
            <p className="text-[12px] font-bold text-amber-800">{op.display_name}</p>
            <p className="text-[10px] text-amber-600">Mint ERC-8004 on GOAT Testnet3</p>
          </div>
          <button
            onClick={() => void mintOne(op)}
            disabled={minting === op.id}
            className="rounded border border-amber-500 bg-amber-400 px-3 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {minting === op.id ? 'Signing...' : 'Mint'}
          </button>
        </div>
      ))}
    </div>
  )
}
