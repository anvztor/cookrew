/**
 * ModeRoller — 3D cylinder dial for the composer dock.
 *
 * Cycles SEED BUNDLE / SEED TASK / ASK ORACLE. Click to advance,
 * right-click to step back, drag vertically or scroll to spin the
 * drum, releases snap to the nearest face.
 */
'use client'

import { useRef, useState } from 'react'

export type ComposerMode = 'seed' | 'task' | 'ask'

export interface ComposerModeMeta {
  readonly v: ComposerMode
  readonly l: string
  readonly tip: string
  readonly bg: string
}

export const COMPOSER_MODES: readonly ComposerModeMeta[] = [
  {
    v: 'seed',
    l: 'SEED BUNDLE',
    tip: 'start a new bundle (unit of work)',
    bg: '#FFD600',
  },
  {
    v: 'task',
    l: 'SEED TASK',
    tip: 'start a single task under an existing bundle',
    bg: '#9DE3C5',
  },
  {
    v: 'ask',
    l: 'ASK ORACLE',
    tip: 'query facts · no work spawned',
    bg: '#C7B6F5',
  },
]

const FACES = 8
const FACE_H = 26
const FACE_ANGLE = 360 / FACES
const RADIUS = (FACE_H / 2) / Math.tan(Math.PI / FACES)
const VIEWPORT_H = Math.round(RADIUS * 2 + 4)
const ROLLER_W = 150

export function ModeRoller({
  value,
  onChange,
}: {
  value: ComposerMode
  onChange: (next: ComposerMode) => void
}) {
  const N = COMPOSER_MODES.length
  const idx = Math.max(0, COMPOSER_MODES.findIndex((m) => m.v === value))
  const mode = COMPOSER_MODES[idx] ?? COMPOSER_MODES[0]

  const [animating, setAnimating] = useState(false)
  const [drag, setDrag] = useState<{ startY: number; dy: number; moved: boolean } | null>(null)
  const wheelLock = useRef(0)

  const wrap = (i: number) => ((i % N) + N) % N
  const setIdx = (next: number) => {
    const v = COMPOSER_MODES[wrap(next)].v
    if (v !== value) onChange(v)
  }
  const step = (dir: number) => {
    setAnimating(true)
    setIdx(idx + dir)
    window.setTimeout(() => setAnimating(false), 240)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ startY: e.clientY, dy: 0, moved: false })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const dy = e.clientY - drag.startY
    setDrag((d) => (d ? { ...d, dy, moved: d.moved || Math.abs(dy) > 3 } : d))
  }
  const onPointerUp = () => {
    if (!drag) return
    const { dy, moved } = drag
    setDrag(null)
    if (!moved) {
      step(1)
      return
    }
    const steps = Math.round(-dy / FACE_H)
    if (steps !== 0) {
      setAnimating(true)
      setIdx(idx + steps)
      window.setTimeout(() => setAnimating(false), 240)
    }
  }
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const now = Date.now()
    if (now - wheelLock.current < 180) return
    if (Math.abs(e.deltaY) < 4) return
    wheelLock.current = now
    step(e.deltaY > 0 ? 1 : -1)
  }

  const dragSteps = drag ? Math.max(-1.6, Math.min(1.6, -drag.dy / FACE_H)) : 0
  const virtualIdx = idx + dragSteps
  const drumAngle = -virtualIdx * FACE_ANGLE
  const drumTransition = drag
    ? 'none'
    : animating
      ? 'transform 240ms cubic-bezier(.2,.85,.3,1)'
      : 'transform 0ms'

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        step(-1)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      title={`${mode.tip} · drag, click, or scroll`}
      style={{
        position: 'relative',
        width: ROLLER_W,
        height: VIEWPORT_H,
        flexShrink: 0,
        background: 'var(--cream-md)',
        border: '2px solid var(--line)',
        boxShadow:
          'inset 2px 2px 0 rgba(0,0,0,0.18), inset -2px -2px 0 var(--cream-hi)',
        userSelect: 'none',
        cursor: drag ? 'grabbing' : 'grab',
        touchAction: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 3D drum */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 600,
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${-RADIUS}px) rotateX(${drumAngle}deg)`,
            transition: drumTransition,
            willChange: 'transform',
          }}
        >
          {COMPOSER_MODES.map((m, i) => {
            let slot = i - idx
            if (slot > N / 2) slot -= N
            if (slot < -N / 2) slot += N
            return <Face key={m.v} m={m} slot={slot} isCenter={slot === 0} />
          })}
        </div>
      </div>

      {/* Top/bottom shading sells the curve */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '40%',
          background:
            'linear-gradient(to bottom, rgba(45,42,32,0.22), rgba(45,42,32,0))',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '40%',
          background:
            'linear-gradient(to top, rgba(45,42,32,0.22), rgba(45,42,32,0))',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* Center selector window */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: FACE_H,
          marginTop: -FACE_H / 2,
          borderTop: '1.5px solid var(--amber-deep)',
          borderBottom: '1.5px solid var(--amber-deep)',
          boxShadow: 'inset 0 0 0 1px rgba(217,119,6,0.18)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Chevron hints */}
      <div
        style={{
          position: 'absolute',
          right: 4,
          top: 2,
          fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
          fontSize: 6,
          color: 'var(--muted)',
          pointerEvents: 'none',
          zIndex: 6,
          lineHeight: 1,
        }}
      >
        ▲
      </div>
      <div
        style={{
          position: 'absolute',
          right: 4,
          bottom: 2,
          fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
          fontSize: 6,
          color: 'var(--muted)',
          pointerEvents: 'none',
          zIndex: 6,
          lineHeight: 1,
        }}
      >
        ▼
      </div>

      {/* Position counter */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: '50%',
          marginTop: -FACE_H / 2 - 9,
          fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
          fontSize: 7,
          color: 'var(--amber-deep)',
          letterSpacing: 0.3,
          pointerEvents: 'none',
          zIndex: 6,
          lineHeight: 1,
        }}
      >
        {idx + 1}/{N}
      </div>
    </div>
  )
}

function Face({
  m,
  slot,
  isCenter,
}: {
  m: ComposerModeMeta
  slot: number
  isCenter: boolean
}) {
  const angle = slot * FACE_ANGLE
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: FACE_H,
        marginTop: -FACE_H / 2,
        transform: `rotateX(${angle}deg) translateZ(${RADIUS}px)`,
        backfaceVisibility: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: isCenter ? 'var(--amber-cream)' : 'var(--cream-hi)',
        borderTop: '1px dashed rgba(45,42,32,0.18)',
        borderBottom: '1px dashed rgba(45,42,32,0.18)',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: m.bg,
          boxShadow:
            'inset -1px -1px 0 rgba(0,0,0,0.25), inset 1px 1px 0 rgba(255,255,255,0.6)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
          fontSize: 9,
          letterSpacing: 0.5,
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {m.l}
      </span>
    </div>
  )
}
