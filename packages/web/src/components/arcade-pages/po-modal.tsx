/**
 * PoModal — shared modal shell for Cookbook / History / Review popouts.
 *
 * Rendered as a fixed-position overlay. Closes on ESC and on backdrop click.
 * Styling lives in globals.css (.po-backdrop, .po-card, .po-titlebar, etc.)
 */
'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'

export function PoModal({
  width,
  height,
  title,
  subtitle,
  onClose,
  toolbar,
  children,
}: {
  width: number | string
  height: number | string
  title: string
  subtitle?: string
  onClose: () => void
  toolbar?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="pc-root po-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="po-card ap-root"
        style={{ width, height, maxWidth: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="po-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 10 }}>
            <div
              style={{
                fontFamily:
                  "var(--font-press-start-2p), 'Press Start 2P', monospace",
                fontSize: 11,
                color: 'var(--ink)',
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div className="ap-silk" style={{ fontSize: 9, color: 'var(--ink-soft)' }}>
                ▸ {subtitle}
              </div>
            )}
          </div>
          <button className="po-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>
        {toolbar && <div className="po-toolbar">{toolbar}</div>}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
