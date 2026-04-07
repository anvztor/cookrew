'use client'

import { Play, Square } from 'lucide-react'
import type { EventPayload, TokenUsage } from '@/types'

function formatDuration(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return ''
  }
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds - minutes * 60)
  return `${minutes}m ${remaining}s`
}

function formatTokens(tokens: TokenUsage | undefined): string {
  if (!tokens) return ''
  const input = tokens.input_tokens ?? 0
  const output = tokens.output_tokens ?? 0
  const total = input + output
  if (total <= 0) return ''
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k tok`
  return `${total} tok`
}

function formatCost(cost: number | undefined): string {
  if (typeof cost !== 'number' || cost <= 0) return ''
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(3)}`
}

export function SessionPill({
  payload,
  kind,
}: {
  readonly payload: EventPayload | null
  readonly kind: 'session_start' | 'session_end'
}) {
  if (kind === 'session_start' && payload?.kind === 'session_start') {
    const label = [payload.agentName, payload.model].filter(Boolean).join(' · ')
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#059669]/30 bg-[#ECFDF5] px-2.5 py-1 text-[11px] text-[#065F46]">
        <Play size={11} className="fill-[#059669] text-[#059669]" />
        <span className="font-medium">{label || 'session started'}</span>
        {payload.cwd ? (
          <span className="text-[#047857]/70 font-mono">{payload.cwd}</span>
        ) : null}
      </div>
    )
  }

  if (kind === 'session_end' && payload?.kind === 'session_end') {
    const pieces = [
      formatDuration(payload.durationMs),
      formatTokens(payload.tokens),
      formatCost(payload.costUsd),
    ].filter(Boolean)
    const borderColor = payload.success ? '#059669' : '#B91C1C'
    const bg = payload.success ? '#ECFDF5' : '#FEF2F2'
    const fg = payload.success ? '#065F46' : '#991B1B'
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]"
        style={{ borderColor: `${borderColor}4D`, backgroundColor: bg, color: fg }}
      >
        <Square size={11} className={payload.success ? 'fill-[#059669] text-[#059669]' : 'fill-[#B91C1C] text-[#B91C1C]'} />
        <span className="font-medium">
          {payload.success ? 'session ended' : 'session failed'}
        </span>
        {pieces.length > 0 ? (
          <span className="text-current/80">{pieces.join(' · ')}</span>
        ) : null}
      </div>
    )
  }

  return null
}
