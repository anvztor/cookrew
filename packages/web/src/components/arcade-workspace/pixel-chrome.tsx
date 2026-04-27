/**
 * Pixel-Chrome — Pip-Boy/Tamagotchi primitives.
 *
 * Atomic UI pieces reused across the arcade workspace. All visual
 * styling lives in globals.css under .pc-* classes; this file only
 * provides typed React wrappers.
 */
'use client'

import type { CSSProperties, ReactNode } from 'react'

// ── HP / MP / XP Bar ─────────────────────────────────────
export function HPBar({
  label,
  value,
  max = 100,
  kind = 'hp',
}: {
  label: string
  value: number
  max?: number
  kind?: 'hp' | 'mp' | 'xp'
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  const low = kind === 'hp' && pct < 25
  return (
    <div className={`pc-bar ${kind}${low ? ' low' : ''}`}>
      <div className="pc-bar-label">{label}</div>
      <div className="pc-bar-track ticks">
        <div className="pc-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pc-bar-val">
        {value}/{max}
      </div>
    </div>
  )
}

// ── LED indicator ───────────────────────────────────────
export type LEDState = 'on' | 'off' | 'busy' | 'red'
export function LED({ state = 'on' }: { state?: LEDState }) {
  return <span className={`pc-led ${state}`} />
}

// ── Pixel Button ────────────────────────────────────────
export function PixelBtn({
  variant = '',
  size = '',
  children,
  onClick,
  style,
  title,
  type = 'button',
  disabled = false,
}: {
  variant?: '' | 'primary' | 'danger' | 'ghost'
  size?: '' | 'sm' | 'tiny'
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const cls = ['pc-btn', variant, size].filter(Boolean).join(' ')
  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      style={style}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// ── Phosphor Screen wrapper (with scanlines) ────────────
export function PhosScreen({
  children,
  style,
  className = '',
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <div className={`pc-phos-screen pc-crt ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── Pixel sprite portrait (16x16 rendered via CSS grid) ─
const SPRITE_PALETTE: Record<string, string> = {
  '.': 'transparent',
  '#': '#2D2A20',
  '+': '#FFD600',
  y: '#FFEDB0',
  o: '#D97706',
  p: '#9B8ACB',
  P: '#7A6AAB',
  g: '#6BBE58',
  G: '#2B5A22',
  b: '#4AA3E6',
  B: '#1D4A7A',
  r: '#DC2626',
  w: '#FFFEF5',
  s: '#A8A29E',
  e: '#059669',
  c: '#14110A',
}

export function Sprite16({
  art,
  size = 48,
  bg = '#FFFEF5',
}: {
  art: readonly string[]
  size?: number
  bg?: string
}) {
  const cell = size / 16
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'grid',
        gridTemplateColumns: `repeat(16, ${cell}px)`,
        gridTemplateRows: `repeat(16, ${cell}px)`,
        background: bg,
        border: '1.5px solid #2D2A20',
        imageRendering: 'pixelated',
        flexShrink: 0,
      }}
    >
      {art.flatMap((row, y) =>
        [...row].map((ch, x) => (
          <div
            key={`${y}-${x}`}
            style={{ background: SPRITE_PALETTE[ch] ?? 'transparent' }}
          />
        )),
      )}
    </div>
  )
}

// ── Pre-baked 16x16 portraits ──────────────────────────
export const PORTRAITS: Record<string, readonly string[]> = {
  human: [
    '................',
    '................',
    '......####......',
    '.....#yyyy#.....',
    '....#yy##yy#....',
    '....#y####y#....',
    '....#yyyyyy#....',
    '.....#yyyy#.....',
    '......####......',
    '.....#++++#.....',
    '....#+#++#+#....',
    '...#++++++++#...',
    '..#++#++++#++#..',
    '..#+#++++++#+#..',
    '...#+#....#+#...',
    '...####..####...',
  ],
  agent_a: [
    '................',
    '....########....',
    '...#ssssssss#...',
    '..#ss######ss#..',
    '.#ss#gg##gg#ss#.',
    '.#ss#gg##gg#ss#.',
    '.#ss########ss#.',
    '.#ssss#ss#ssss#.',
    '.#sssssssssss#.',
    '..#sss####sss#..',
    '...#########....',
    '....#+++++#.....',
    '...#+++++++#....',
    '..#++#+++#++#...',
    '..#+#++++++#....',
    '..##.......##...',
  ],
  agent_b: [
    '................',
    '......####......',
    '.....#pppp#.....',
    '....#pp##pp#....',
    '...#p#pppp#p#...',
    '...#pppppppp#...',
    '...#p#pppp#p#...',
    '....#pp##pp#....',
    '.....#pppp#.....',
    '......####......',
    '.....#ppPp#.....',
    '....#p#PP#p#....',
    '...#pp####pp#...',
    '...#p#####p#....',
    '....#p####p#....',
    '....##....##....',
  ],
  agent_c: [
    '................',
    '....########....',
    '...#eeeeeeee#...',
    '..#ee######ee#..',
    '.#ee#bb##bb#ee#.',
    '.#ee########ee#.',
    '.#ee#wwwwww#ee#.',
    '.#ee########ee#.',
    '..#ee######ee#..',
    '...#eeeeeeee#...',
    '....#+#++#+#....',
    '...#+++##+++#...',
    '...#+++##+++#...',
    '...#+#++++#+#...',
    '...##......##...',
    '................',
  ],
  agent_d: [
    '................',
    '......####......',
    '.....#rrrr#.....',
    '....#rr##rr#....',
    '...#r#o##o#r#...',
    '...#rr####rr#...',
    '...#rr#oo#rr#...',
    '....#r####r#....',
    '.....#####......',
    '....#+++++#.....',
    '...#+++++++#....',
    '..#+#+++++#+#...',
    '..#+#+++++#+#...',
    '...#+#+++#+#....',
    '....##...##.....',
    '................',
  ],
  agent_e: [
    '................',
    '....########....',
    '...#cccccccc#...',
    '..#cc######cc#..',
    '.#cc#++##++#cc#.',
    '.#cc#+####+#cc#.',
    '.#cc########cc#.',
    '.#cc#ssssss#cc#.',
    '.#cc########cc#.',
    '..#cccccccccc#..',
    '...##########...',
    '....#++++++#....',
    '...#++#++#++#...',
    '...#+#####+#....',
    '...##.....##....',
    '................',
  ],
  system: [
    '................',
    '....########....',
    '...#++++++++#...',
    '..#++########++.',
    '.#++#cccccc#++#.',
    '.#++#c####c#++#.',
    '.#++#c#ee#c#++#.',
    '.#++#c#ee#c#++#.',
    '.#++#c####c#++#.',
    '.#++#cccccc#++#.',
    '.#++########++#.',
    '..#++########+..',
    '...#++++++++#...',
    '....########....',
    '................',
    '................',
  ],
}
