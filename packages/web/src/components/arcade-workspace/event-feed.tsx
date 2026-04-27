/**
 * EventFeed — Pip-Boy phosphor CRT scrolling window.
 *
 * Floats top-right of the stage, always visible. Expandable to a
 * larger drawer. Filter tabs (ALL / TOOL / THINK / MILESTONE / WARN)
 * narrow the feed in-place. Lines are fed from real krewhub events
 * via the `eventsToPipBoyLines` mapper.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import type { PipBoyKind, PipBoyLine } from './mapping'

const KIND_COLOR: Record<PipBoyKind, string> = {
  bundle: 'var(--phos-glow)',
  claim: 'var(--phos)',
  tool: '#7AC4E5',
  think: '#BFA3E0',
  milestone: '#6BCF88',
  fact: '#6BCF88',
  code: '#E9B949',
  done: '#6BCF88',
  warn: '#FF9A6B',
  prompt: '#E9B949',
  reply: 'var(--phos-glow)',
}

const FILTER_MAP: Record<string, PipBoyKind[]> = {
  ALL: [],
  TOOL: ['tool'],
  THINK: ['think'],
  MILESTONE: ['milestone', 'fact', 'code', 'done'],
  WARN: ['warn'],
}

export function EventFeed({
  lines,
  bundleLabel,
  expanded,
  onToggle,
  onClose,
  highlightedAgent,
  connected,
}: {
  lines: readonly PipBoyLine[]
  bundleLabel: string
  expanded: boolean
  onToggle: (next: boolean) => void
  /** Fully hide the feed — re-open via the EVENTS TRACED chip. */
  onClose?: () => void
  highlightedAgent: string | null
  connected: boolean
}) {
  const [filter, setFilter] = useState('ALL')
  const filters = ['ALL', 'TOOL', 'THINK', 'MILESTONE', 'WARN']
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedKinds = FILTER_MAP[filter] ?? []
  const filtered =
    selectedKinds.length === 0
      ? lines
      : lines.filter((l) => selectedKinds.includes(l.kind))

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [filtered.length])

  return (
    <div
      style={{
        position: 'absolute',
        right: expanded ? 0 : 16,
        top: expanded ? 0 : 16,
        bottom: expanded ? 0 : 16,
        width: expanded ? 'min(680px, 55%)' : 340,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease, right 200ms ease, top 200ms ease, bottom 200ms ease',
      }}
    >
      <div
        className="pc-phos-screen pc-crt"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          padding: 0,
          boxShadow: expanded ? 'none' : '6px 6px 0 var(--line)',
          borderRadius: 0,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(233,185,73,0.35)',
            background: 'rgba(233,185,73,0.08)',
            position: 'relative',
            zIndex: 4,
          }}
        >
          <div className="pc-silk pc-phos-hi" style={{ fontSize: 10, letterSpacing: 1.5 }}>
            ▮ KREWHUB FEED · {bundleLabel}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                title="hide feed (re-open via EVENTS TRACED)"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--phos-dim)',
                  color: 'var(--phos)',
                  padding: '2px 8px',
                  fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
                  fontSize: 11,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                –
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle(!expanded)
              }}
              title={expanded ? 'collapse drawer' : 'expand drawer'}
              style={{
                background: 'transparent',
                border: '1px solid var(--phos-dim)',
                color: 'var(--phos)',
                padding: '2px 6px',
                fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {expanded ? '□' : '⊞'}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 1,
            padding: '6px 8px',
            borderBottom: '1px solid rgba(233,185,73,0.35)',
            position: 'relative',
            zIndex: 4,
          }}
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'rgba(233,185,73,0.22)' : 'transparent',
                border:
                  '1px solid ' + (filter === f ? 'var(--phos)' : 'var(--phos-dim)'),
                color: filter === f ? 'var(--phos-glow)' : 'var(--phos-dim)',
                padding: '2px 6px',
                fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
                fontSize: 8,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div
            className="pc-mono"
            style={{ color: 'var(--phos-dim)', fontSize: 10, alignSelf: 'center' }}
          >
            {filtered.length} EVTS
          </div>
        </div>

        {/* Scrolling feed */}
        <div
          ref={scrollRef}
          className="pc-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 12px',
            fontFamily: "var(--font-vt323), 'VT323', monospace",
            fontSize: 14,
            lineHeight: 1.35,
            position: 'relative',
            zIndex: 4,
          }}
        >
          {filtered.length === 0 && (
            <div
              className="pc-phos-dim"
              style={{ fontSize: 13, opacity: 0.7, padding: 10 }}
            >
              No events yet — {connected ? 'waiting for agents' : 'not connected'}…
            </div>
          )}
          {filtered.map((l) => (
            <div
              key={l.id}
              style={{
                marginBottom: 4,
                opacity:
                  highlightedAgent &&
                  !l.src
                    .toLowerCase()
                    .includes(
                      String(highlightedAgent).split('@')[0].toLowerCase(),
                    )
                    ? 0.4
                    : 1,
                transition: 'opacity 120ms',
              }}
            >
              <span className="pc-phos-dim">[{l.t}]</span>{' '}
              <span style={{ color: KIND_COLOR[l.kind] ?? 'var(--phos)' }}>
                {l.src !== '—' ? `${l.src} · ` : ''}
                {l.msg}
              </span>
            </div>
          ))}
          <div className="pc-cursor pc-phos-hi" style={{ fontSize: 14 }}>
            $&nbsp;
          </div>
        </div>

        {/* Footer heartbeat */}
        <div
          style={{
            padding: '4px 10px',
            borderTop: '1px solid rgba(233,185,73,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--phos-dim)',
            position: 'relative',
            zIndex: 4,
          }}
        >
          <span>SSE · {connected ? 'connected' : 'disconnected'}</span>
          <span style={{ animation: 'pc-blink 1.2s step-end infinite' }}>♥ 30s TTL</span>
        </div>
      </div>
    </div>
  )
}
