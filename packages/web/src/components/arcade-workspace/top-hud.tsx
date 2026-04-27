/**
 * TopHUD — arcade header with recipe/bundle chips + status counters.
 */
'use client'

import Link from 'next/link'
import type { Bundle, Recipe } from '@cookrew/shared'
import { PixelBtn } from './pixel-chrome'

export function TopHUD({
  recipe,
  selectedBundle,
  onlineAgents,
  blockedCount,
  elapsed,
  cookbookHref,
  historyHref,
  reviewHref,
  onReportIn,
  onSandbox,
  bundleSelector,
}: {
  recipe: Recipe | null
  selectedBundle: Bundle | null
  onlineAgents: number
  blockedCount: number
  elapsed: string
  cookbookHref: string
  historyHref: string
  reviewHref: string | null
  onReportIn?: () => void
  /** Click the recipe chip → open the SandboxWindow inside the workspace. */
  onSandbox?: () => void
  bundleSelector?: React.ReactNode
}) {
  const recipeLabel = recipe?.name ? recipe.name.toUpperCase() : '—'
  const bundleLabel = selectedBundle
    ? `${selectedBundle.id.slice(0, 12)} · ${selectedBundle.status.toUpperCase()}`
    : 'NO ACTIVE BUNDLE'
  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'var(--ink)',
        borderBottom: '3px solid var(--line)',
        color: '#FFEDB0',
        boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link
          href="/"
          style={{
            width: 34,
            height: 34,
            background: 'var(--amber)',
            border: '2px solid #FFEDB0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 11,
            color: 'var(--ink)',
          }}
          title="Back to cookbooks"
        >
          CK
        </Link>
        <div>
          <div
            className="pc-display"
            style={{ fontSize: 14, letterSpacing: 1, color: 'var(--amber)' }}
          >
            COOKREW
          </div>
          <div
            className="pc-silk"
            style={{ fontSize: 8, color: '#D6D3D1', letterSpacing: 1.2 }}
          >
            ARCADE MODE · v0.∞
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button
          type="button"
          className="pc-chip phos"
          onClick={(e) => {
            e.stopPropagation()
            onSandbox?.()
          }}
          disabled={!onSandbox}
          title={onSandbox ? 'open sandbox view + rights matrix' : undefined}
          style={{
            fontSize: 9,
            border: '1.5px solid var(--phos-dim)',
            padding: '3px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: onSandbox ? 'pointer' : 'default',
            fontFamily: 'inherit',
            letterSpacing: 'inherit',
          }}
        >
          ▶ RECIPE · {recipeLabel}
          {onSandbox && (
            <span style={{ color: 'var(--phos)', opacity: 0.7 }}>⇱</span>
          )}
        </button>
        <div
          className="pc-chip"
          style={{
            fontSize: 9,
            background: 'rgba(233,185,73,0.15)',
            color: '#FFEDB0',
            borderColor: 'var(--phos-dim)',
          }}
          title={selectedBundle?.prompt ?? ''}
        >
          {bundleLabel}
        </div>
        {bundleSelector}
        {recipe && (
          <div className="pc-mono" style={{ color: '#A8A29E', fontSize: 10 }}>
            {recipe.default_branch}
          </div>
        )}
      </div>
      <div className="pc-mono" style={{ color: '#D6D3D1', fontSize: 10 }}>
        <span style={{ color: 'var(--hp)' }}>●</span> {onlineAgents} online
        &nbsp;&nbsp;
        <span style={{ color: 'var(--amber)' }}>⚑</span> {blockedCount} blocked
        &nbsp;&nbsp;
        <span style={{ color: 'var(--violet)' }}>⏱</span> {elapsed}
      </div>
      <Link href={cookbookHref} style={{ color: 'inherit' }}>
        <PixelBtn
          size="sm"
          variant="ghost"
          style={{ color: '#FFEDB0', borderColor: '#FFEDB0' }}
        >
          COOKBOOK
        </PixelBtn>
      </Link>
      <Link href={historyHref} style={{ color: 'inherit' }}>
        <PixelBtn
          size="sm"
          variant="ghost"
          style={{ color: '#FFEDB0', borderColor: '#FFEDB0' }}
        >
          HISTORY
        </PixelBtn>
      </Link>
      {reviewHref ? (
        <Link href={reviewHref} style={{ color: 'inherit' }}>
          <PixelBtn size="sm" variant="primary">
            ▣ REPORT-IN
          </PixelBtn>
        </Link>
      ) : (
        <PixelBtn size="sm" variant="primary" onClick={onReportIn} disabled>
          ▣ REPORT-IN
        </PixelBtn>
      )}
    </header>
  )
}
