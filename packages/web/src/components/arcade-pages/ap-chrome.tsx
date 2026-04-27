/**
 * ap-chrome — shared pixel primitives for the non-workspace surfaces.
 *
 * Used by ArcadeHome and the 3 popouts (Cookbook, Recipe History,
 * Bundle Review). Styling lives in globals.css under .ap-*.
 */
'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

// ── ApTopBar (home header) ──────────────────────────────
export function ApTopBar({
  crumbs = [],
  right,
}: {
  crumbs?: string[]
  right?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '2px solid var(--line)',
        background: 'var(--cream-hi)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/"
          style={{
            width: 32,
            height: 32,
            background: 'var(--amber)',
            border: '2px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 var(--line)',
            fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 13,
            color: 'var(--ink)',
          }}
        >
          K
        </Link>
        <div
          className="ap-press"
          style={{ fontSize: 13, color: 'var(--ink)' }}
        >
          COOKREW<span style={{ color: 'var(--muted)' }}>·ARCADE</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--line-soft)' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
            fontSize: 10,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {crumbs.map((c, i) => (
            <span key={`${c}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: 'var(--dim)' }}>▸</span>}
              <span style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--muted)' }}>{c}</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
    </div>
  )
}

// ── ApPlayerPill (identity chip) ────────────────────────
export function ApPlayerPill({
  name,
  digestCount,
  loggedIn = false,
  walletAddress,
  onLogin,
  onLogout,
}: {
  name?: string | null
  /** Count of approved digests this player has. Shown as ✓N if > 0. */
  digestCount?: number | null
  loggedIn?: boolean
  walletAddress?: string | null
  onLogin?: () => void
  onLogout?: () => void
}) {
  if (!loggedIn) {
    return (
      <button
        type="button"
        className="ap-btn primary sm"
        onClick={onLogin}
      >
        ⌘ CONNECT WALLET
      </button>
    )
  }
  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`
    : ''
  const showDigests = digestCount != null && digestCount > 0
  return (
    <>
      {showDigests && (
        <div
          className="ap-sunken"
          style={{
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title={`${digestCount} approved digest${digestCount === 1 ? '' : 's'}`}
        >
          <span
            className="ap-silk"
            style={{ fontSize: 10, color: 'var(--emerald-dim, #0B4F2E)' }}
          >
            ✓
          </span>
          <span className="ap-mono" style={{ fontSize: 12, fontWeight: 600 }}>
            {digestCount}
          </span>
        </div>
      )}
      <div
        className="ap-card flat"
        style={{
          padding: '4px 10px 4px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderWidth: 2,
          cursor: onLogout ? 'pointer' : 'default',
        }}
        onClick={onLogout}
        title={onLogout ? 'Log out' : ''}
      >
        <div
          style={{
            width: 22,
            height: 22,
            background: 'var(--amber)',
            border: '1.5px solid var(--line)',
            fontFamily:
              "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(name ?? 'P').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ lineHeight: 1 }}>
          <div className="ap-silk" style={{ fontSize: 10, color: 'var(--ink)' }}>
            {(name ?? 'PLAYER').toUpperCase().slice(0, 14)}
          </div>
          {shortAddr && (
            <div
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--muted)',
              }}
            >
              {shortAddr}
            </div>
          )}
        </div>
        <span className="ap-led on" />
      </div>
    </>
  )
}

// ── ApCartridge (recipe/project cover card) ─────────────
export function ApCartridge({
  title,
  subtitle,
  swatch = 'a',
  icon = '▤',
  w = 180,
  h = 220,
}: {
  title: string
  subtitle?: string
  swatch?: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  icon?: string
  w?: number | string
  h?: number | string
}) {
  const style: CSSProperties = {
    width: w as number | string,
    height: h as number | string,
    background: 'var(--cream-hi)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  }
  const numericH = typeof h === 'number' ? h : 220
  return (
    <div className="ap-pixart" style={style}>
      <div
        className={`ap-swatch-${swatch}`}
        style={{
          height: numericH * 0.58,
          position: 'relative',
          borderBottom: '2px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 10,
            background: 'var(--cream-hi)',
            border: '2px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 28,
            color: 'var(--ink)',
          }}
        >
          {icon}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            background: 'var(--line)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 18,
            height: 18,
            background: 'var(--cream-hi)',
            border: '1.5px solid var(--line)',
          }}
        />
      </div>
      <div style={{ padding: 10, flex: 1, overflow: 'hidden' }}>
        <div
          className="ap-silk"
          style={{
            fontSize: 10,
            color: 'var(--ink)',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </div>
        {subtitle && (
          <div className="ap-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {/* cartridge notches */}
      <div style={{ position: 'absolute', bottom: -2, left: 14, width: 20, height: 6, background: 'var(--line)' }} />
      <div style={{ position: 'absolute', bottom: -2, right: 14, width: 20, height: 6, background: 'var(--line)' }} />
    </div>
  )
}

/**
 * Deterministic hash → pick a swatch/icon for a stable cartridge cover.
 */
export function swatchFor(id: string): 'a' | 'b' | 'c' | 'd' | 'e' | 'f' {
  const opts: ('a' | 'b' | 'c' | 'd' | 'e' | 'f')[] = ['a', 'b', 'c', 'd', 'e', 'f']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return opts[Math.abs(h) % opts.length]
}

export function iconFor(name: string): string {
  const icons = ['⎔', '◈', '⌘', '§', '▸', '◉', '▤', '≋']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return icons[Math.abs(h) % icons.length]
}
