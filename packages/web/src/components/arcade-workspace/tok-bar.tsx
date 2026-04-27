/**
 * TokBar — token-usage tracer for an agent. Shows REMAINING tokens of
 * a rolling window: 7d (green HP feel, long-burn budget) on top, 5h
 * (blue MP feel, short rate-limit horizon) below.
 *
 * Drains down as tokens are consumed; flashes rose when ≤10% remaining.
 * If `used`/`max` aren't known yet (backend hasn't surfaced them), the
 * bar renders empty with `—/—` instead of fake numbers.
 */
'use client'

export type TokBarKind = 'hp' | 'mp'

const SEGMENTS = 12

function fmtTok(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '') + 'k'
  return String(n)
}

export function TokBar({
  window: w,
  used,
  max,
  hot = false,
  kind,
}: {
  window: '5h' | '7d'
  /** Tokens used this window. `null` = data not available yet. */
  used: number | null
  /** Window budget. `null` = data not available yet. */
  max: number | null
  /** Force hot/critical visual (in addition to ≤10% remaining). */
  hot?: boolean
  /** Override default palette: 7d → 'hp' (green), 5h → 'mp' (blue). */
  kind?: TokBarKind
}) {
  const hasData = used !== null && max !== null && max > 0
  const usedPct = hasData ? Math.max(0, Math.min(1, used / max)) : 0
  const remaining = hasData ? Math.max(0, max - used) : 0
  const remPct = hasData ? 1 - usedPct : 0
  const filled = hasData ? Math.round(remPct * SEGMENTS) : 0
  const baseKind: TokBarKind = kind ?? (w === '7d' ? 'hp' : 'mp')
  const critical = hasData && remPct <= 0.1
  const tone = critical ? 'rose' : baseKind
  const isHot = hot || critical

  return (
    <div className={`pc-tokbar ${tone}${isHot ? ' hot' : ''}`}>
      <div className="pc-tokbar-w">{w}</div>
      <div className="pc-tokbar-track">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span key={i} className={`pc-tokbar-seg${i < filled ? ' on' : ''}`} />
        ))}
      </div>
      <div className="pc-tokbar-val">
        {hasData ? `${fmtTok(remaining)}/${fmtTok(max)}` : '—/—'}
      </div>
    </div>
  )
}
