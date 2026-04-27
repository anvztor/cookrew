/**
 * PopWindow — draggable popup chrome with zoom, fullscreen and close.
 *
 * Each instance manages its own position/zoom/fullscreen state. Click
 * handlers everywhere call stopPropagation so the window's chrome
 * doesn't leak clicks into the canvas under it.
 */
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type PopWindowAccent = 'cream' | 'amber' | 'violet' | 'rose'

export function PopWindow({
  id,
  title,
  subtitle,
  accent = 'cream',
  initialX,
  initialY,
  width,
  height,
  onClose,
  onFocus,
  z = 10,
  extraChromeRight,
  children,
}: {
  id: string
  title: string
  subtitle?: string
  accent?: PopWindowAccent
  initialX: number
  initialY: number
  width: number | string
  height: number | string
  onClose?: () => void
  onFocus?: (id: string) => void
  z?: number
  extraChromeRight?: ReactNode
  children: ReactNode
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const [zoom, setZoom] = useState(1)
  const [fs, setFs] = useState(false)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const zv = Math.round(zoom * 100)

  useEffect(() => {
    setPos({ x: initialX, y: initialY })
  }, [initialX, initialY])

  const onDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('.sp-chip')) return
    onFocus?.(id)
    if (fs) return
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      setPos({ x: ev.clientX - d.dx, y: ev.clientY - d.dy })
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      className={`sp-win${fs ? ' fs' : ''}`}
      style={
        {
          left: pos.x,
          top: pos.y,
          width,
          height,
          zIndex: z,
          ['--sp-zoom']: zoom,
        } as React.CSSProperties & Record<'--sp-zoom', number>
      }
      onMouseDown={() => onFocus?.(id)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`sp-titlebar ${accent}`} onMouseDown={onDown}>
        <div className="sp-tl-dots">
          <span
            className="sp-tl-dot"
            title="close"
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
            }}
          />
          <span className="sp-tl-dot a" title="minimize" />
          <span
            className="sp-tl-dot g"
            title="zoom"
            onClick={(e) => {
              e.stopPropagation()
              setFs(!fs)
            }}
          />
        </div>
        <div className="sp-tl-title">
          <b>{title}</b>
          {subtitle && <span>{subtitle}</span>}
        </div>
        <div className="sp-tl-spacer" />
        {extraChromeRight}
        <div className="sp-chip" title="Zoom">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))
            }}
          >
            −
          </button>
          <span className="sp-zval">{zv}%</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
            }}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="sp-iconbtn"
          onClick={(e) => {
            e.stopPropagation()
            setFs(!fs)
          }}
          title={fs ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fs ? '⤢' : '⤡'}
        </button>
        <button
          type="button"
          className="sp-iconbtn rose"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="sp-body">
        <div className="sp-zoom-wrap">
          <div className="sp-zoom-inner">{children}</div>
        </div>
      </div>
      <div className="sp-grip" />
    </div>
  )
}
