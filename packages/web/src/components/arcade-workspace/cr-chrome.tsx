/**
 * cr-chrome — primitives for the v3 "Cookrew Arcade Responsive" design.
 *
 * All visual styles live in globals.css under .cr-* classes; this file
 * provides typed React wrappers for buttons, chips, LEDs, bars, sprites,
 * and inputs.
 */
'use client'

import type { CSSProperties, ReactNode } from 'react'

// ── Atoms ────────────────────────────────────────────────────────────

export type CrLEDState = 'on' | 'off' | 'busy' | 'red'

export function CrLED({
  state = 'on',
  style,
}: {
  state?: CrLEDState
  style?: CSSProperties
}) {
  return <span className={`cr-led ${state}`} style={style} />
}

export function CrButton({
  variant,
  size,
  block,
  touch,
  children,
  onClick,
  style,
  title,
  type = 'button',
  disabled = false,
  className,
}: {
  variant?: 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'tiny'
  block?: boolean
  touch?: boolean
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  style?: CSSProperties
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const cls = [
    'cr-btn',
    variant,
    size,
    block && 'block',
    touch && 'touch',
    className,
  ]
    .filter(Boolean)
    .join(' ')
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

export type CrChipTone =
  | 'amber'
  | 'violet'
  | 'emerald'
  | 'rose'
  | 'blue'
  | 'slate'
  | 'phos'

export function CrChip({
  tone,
  children,
  style,
}: {
  tone?: CrChipTone
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span
      className={['cr-chip', tone].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </span>
  )
}

export function CrBar({
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
    <div className={`cr-bar ${kind}${low ? ' low' : ''}`}>
      <div>{label}</div>
      <div className="cr-bar-track">
        <div className="cr-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cr-bar-val">
        {value}/{max}
      </div>
    </div>
  )
}

export function fmtTok(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0', '') + 'M'
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '') + 'k'
  }
  return String(n)
}

export function CrTokBar({
  label = '5h',
  used = 0,
  max = 1,
  kind = 'mp',
  segments = 12,
}: {
  label?: string
  used?: number
  max?: number
  kind?: 'hp' | 'mp' | 'amber' | 'rose'
  segments?: number
}) {
  const remaining = Math.max(0, max - used)
  const safeMax = Math.max(1, max)
  const remPct = remaining / safeMax
  const filled = Math.round(remPct * segments)
  const critical = remPct <= 0.1
  const tone: 'hp' | 'mp' | 'amber' | 'rose' = critical ? 'rose' : kind
  return (
    <div className={`cr-tok ${tone}`}>
      <div style={{ fontSize: 8, color: 'var(--ink)' }}>{label}</div>
      <div className="cr-tok-track">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`cr-tok-seg${i < filled ? ' on' : ''}`}
          />
        ))}
      </div>
      <div className="cr-tok-val">
        {fmtTok(remaining)}/{fmtTok(safeMax)}
      </div>
    </div>
  )
}

export function CrInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={['cr-input', className].filter(Boolean).join(' ')}
    />
  )
}

// ── 16x16 sprite renderer ────────────────────────────────────────────

export const CR_PAL: Record<string, string> = {
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

export function CrSprite({
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
        Array.from(row).map((ch, x) => (
          <div
            key={`${y}-${x}`}
            style={{ background: CR_PAL[ch] || 'transparent' }}
          />
        )),
      )}
    </div>
  )
}

export type CrPortraitName =
  | 'human'
  | 'scout'
  | 'gatekeeper'
  | 'brewer'
  | 'patcher'

export const CR_PORTRAITS: Record<CrPortraitName, readonly string[]> = {
  human: [
    '................', '................', '......####......',
    '.....#yyyy#.....', '....#yy##yy#....', '....#y####y#....',
    '....#yyyyyy#....', '.....#yyyy#.....', '......####......',
    '.....#++++#.....', '....#+#++#+#....', '...#++++++++#...',
    '..#++#++++#++#..', '..#+#++++++#+#..', '...#+#....#+#...',
    '...####..####...',
  ],
  scout: [
    '................', '....########....', '...#ssssssss#...',
    '..#ss######ss#..', '.#ss#gg##gg#ss#.', '.#ss#gg##gg#ss#.',
    '.#ss########ss#.', '.#ssss#ss#ssss#.', '.#sssssssssss#.',
    '..#sss####sss#..', '...#########....', '....#+++++#.....',
    '...#+++++++#....', '..#++#+++#++#...', '..#+#++++++#....',
    '..##.......##...',
  ],
  gatekeeper: [
    '................', '......####......', '.....#pppp#.....',
    '....#pp##pp#....', '...#p#pppp#p#...', '...#pppppppp#...',
    '...#p#pppp#p#...', '....#pp##pp#....', '.....#pppp#.....',
    '......####......', '.....#ppPp#.....', '....#p#PP#p#....',
    '...#pp####pp#...', '...#p#####p#....', '....#p####p#....',
    '....##....##....',
  ],
  brewer: [
    '................', '....########....', '...#eeeeeeee#...',
    '..#ee######ee#..', '.#ee#bb##bb#ee#.', '.#ee########ee#.',
    '.#ee#wwwwww#ee#.', '.#ee########ee#.', '..#ee######ee#..',
    '...#eeeeeeee#...', '....#+#++#+#....', '...#+++##+++#...',
    '...#+++##+++#...', '...#+#++++#+#...', '...##......##...',
    '................',
  ],
  patcher: [
    '................', '......####......', '.....#rrrr#.....',
    '....#rr##rr#....', '...#r#o##o#r#...', '...#rr####rr#...',
    '...#rr#oo#rr#...', '....#r####r#....', '.....#####......',
    '....#+++++#.....', '...#+++++++#....', '..#+#+++++#+#...',
    '..#+#+++++#+#...', '...#+#+++#+#....', '....##...##.....',
    '................',
  ],
}

// Map an arbitrary id/name string to one of the canned portraits so each
// agent renders a stable pixel sprite (cycle through non-human portraits).
const AGENT_PORTRAITS: readonly CrPortraitName[] = [
  'scout',
  'gatekeeper',
  'brewer',
  'patcher',
]

export function pickAgentPortrait(seed: string): CrPortraitName {
  if (!seed) return 'scout'
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AGENT_PORTRAITS[Math.abs(h) % AGENT_PORTRAITS.length]
}

// ── Logo ─────────────────────────────────────────────────────────────

export function CrLogo({
  size = 'md',
  tag = 'BETA',
  tagTone = 'phos',
}: {
  size?: 'sm' | 'md' | 'lg'
  tag?: string | null
  tagTone?: CrChipTone
}) {
  const sz = size === 'lg' ? 22 : size === 'sm' ? 11 : 14
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gridTemplateRows: 'repeat(3,1fr)',
          width: sz + 8,
          height: sz + 8,
          gap: 1,
          padding: 1,
          background: 'var(--ink)',
          boxShadow: '2px 2px 0 var(--line)',
        }}
      >
        {[1, 1, 1, 1, 0, 1, 1, 1, 0].map((on, i) => (
          <span
            key={i}
            style={{ background: on ? 'var(--amber)' : 'transparent' }}
          />
        ))}
      </span>
      <span className="cr-display" style={{ fontSize: sz, color: 'var(--ink)' }}>
        COOKREW
      </span>
      {tag && (
        <CrChip tone={tagTone} style={{ fontSize: 7 }}>
          {tag}
        </CrChip>
      )}
    </div>
  )
}

// ── Profile avatar (sprite + status LED, optional meta) ──────────────

export function CrProfileAvatar({
  name = 'ALEX',
  sub = 'OPERATOR',
  portrait = 'human',
  hp = 92,
  max = 100,
  status = 'on',
  size = 40,
  showMeta = false,
  onClick,
}: {
  name?: string
  sub?: string
  portrait?: CrPortraitName
  hp?: number
  max?: number
  status?: CrLEDState
  size?: number
  showMeta?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showMeta ? 10 : 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <CrSprite
          art={CR_PORTRAITS[portrait] ?? CR_PORTRAITS.human}
          size={size}
          bg="var(--cream-hi)"
        />
        <span style={{ position: 'absolute', bottom: -2, right: -2 }}>
          <CrLED state={status} />
        </span>
      </span>
      {showMeta && (
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            gap: 2,
          }}
        >
          <span className="cr-display" style={{ fontSize: 11 }}>
            {name}
          </span>
          <span
            className="cr-mono"
            style={{
              fontSize: 9,
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub} · HP {hp}/{max}
          </span>
        </span>
      )}
    </button>
  )
}
