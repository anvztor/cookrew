/**
 * CrHeader — top chrome for the responsive Arcade workspace.
 *
 * Slim, mobile-first header with:
 *   - Cookrew logo + bundle id
 *   - PARTY / FEED toggle buttons (right-aligned on both desktop &
 *     mobile; on mobile they open the slide-in drawers)
 *   - Online/total LED counter
 *   - Profile avatar (clicking it opens the auth pane)
 *
 * Replaces the legacy TopHUD ink-coloured strip.
 */
'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  CrButton,
  CrChip,
  CrLED,
  CrLogo,
  CrProfileAvatar,
  pickAgentPortrait,
} from './cr-chrome'

export interface CrHeaderProps {
  variant?: 'mobile' | 'desktop'
  bundleLabel?: string
  recipeName?: string | null
  /** Where the logo should link to — usually the lobby. */
  logoHref?: string
  online?: number
  total?: number
  partyOpen?: boolean
  feedOpen?: boolean
  onParty?: () => void
  onFeed?: () => void
  onAvatar?: () => void
  /** Optional username — drives the avatar sprite + label. */
  username?: string | null
  /** Slot for an extra control (e.g. bundle selector) shown desktop-only. */
  extra?: React.ReactNode
}

export function CrHeader({
  variant = 'desktop',
  bundleLabel = 'NO BUNDLE',
  recipeName = null,
  logoHref = '/',
  online = 0,
  total = 0,
  partyOpen = false,
  feedOpen = false,
  onParty,
  onFeed,
  onAvatar,
  username,
  extra,
}: CrHeaderProps) {
  const isMobile = variant === 'mobile'
  const insets =
    typeof window !== 'undefined' && window.CR_DEVICE_INSETS
      ? window.CR_DEVICE_INSETS
      : { top: 0, bottom: 0, left: 0, right: 0 }
  const padTop = isMobile
    ? `calc(10px + ${insets.top}px + env(safe-area-inset-top, 0px))`
    : 12
  const padLeft = isMobile
    ? `calc(12px + ${insets.left}px + env(safe-area-inset-left, 0px))`
    : 18
  const padRight = isMobile
    ? `calc(12px + ${insets.right}px + env(safe-area-inset-right, 0px))`
    : 18

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: isMobile ? '10px 12px' : '12px 18px',
    paddingTop: padTop,
    paddingLeft: padLeft,
    paddingRight: padRight,
    background: 'var(--cream-hi)',
    borderBottom: '2px solid var(--line)',
    position: 'relative',
    zIndex: 50,
    flexShrink: 0,
  }

  const sprite = pickAgentPortrait(username ?? 'human')
  const displayName = (username ?? 'PLAYER').toUpperCase().slice(0, 12)

  return (
    <header className="cr" style={headerStyle}>
      <Link href={logoHref} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <CrLogo size={isMobile ? 'sm' : 'md'} tag="BETA" tagTone="phos" />
      </Link>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          gap: 2,
          marginLeft: 4,
        }}
      >
        <span
          className="cr-mono"
          style={{
            fontSize: isMobile ? 10 : 11,
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isMobile ? 130 : 320,
          }}
          title={recipeName ?? undefined}
        >
          {bundleLabel}
          {recipeName && !isMobile ? ` · ${recipeName}` : ''}
        </span>
      </div>

      <span style={{ flex: 1 }} />

      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extra}
          <CrChip tone="slate" style={{ fontSize: 8 }}>⌘K SEARCH</CrChip>
          <CrButton size="sm" onClick={onParty}>
            PARTY {partyOpen ? '▾' : '▸'}
          </CrButton>
          <CrButton size="sm" onClick={onFeed}>
            FEED {feedOpen ? '▾' : '▸'}
          </CrButton>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 6,
        }}
      >
        <CrLED state="on" />
        <span className="cr-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {online}/{total}
        </span>
      </div>

      {isMobile && onParty && (
        <button
          type="button"
          onClick={onParty}
          title="party"
          aria-label="party"
          style={iconBtnStyle(partyOpen)}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
            <g fill="var(--line)">
              <circle cx="3.5" cy="4" r="2" />
              <path d="M0 13 v-2 a3.5 3.5 0 0 1 7 0 v2 z" />
              <circle cx="10" cy="3.5" r="2.4" />
              <path d="M6 13 v-2.4 a4 4 0 0 1 8 0 v2.4 z" />
              <circle cx="16.5" cy="4" r="2" />
              <path d="M13 13 v-2 a3.5 3.5 0 0 1 7 0 v2 z" />
            </g>
          </svg>
        </button>
      )}

      {isMobile && onFeed && (
        <button
          type="button"
          onClick={onFeed}
          title="feed"
          aria-label="feed"
          style={iconBtnStyle(feedOpen)}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
            <g fill="var(--line)">
              <rect x="0" y="1" width="3" height="3" />
              <rect x="5" y="1.5" width="13" height="2" />
              <rect x="0" y="6" width="3" height="3" />
              <rect x="5" y="6.5" width="13" height="2" />
              <rect x="0" y="11" width="3" height="3" />
              <rect x="5" y="11.5" width="13" height="2" />
            </g>
          </svg>
        </button>
      )}

      <CrProfileAvatar
        name={displayName}
        sub="OPERATOR"
        portrait={username ? sprite : 'human'}
        hp={92}
        max={100}
        status="on"
        size={isMobile ? 32 : 40}
        showMeta={!isMobile}
        onClick={onAvatar}
      />
    </header>
  )
}

function iconBtnStyle(active: boolean): CSSProperties {
  return {
    border: '2px solid var(--line)',
    background: active ? 'var(--amber)' : 'var(--cream-hi)',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '2px 2px 0 var(--line)',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  }
}

declare global {
  interface Window {
    CR_DEVICE_INSETS?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
}
