/**
 * HITLBarStrip + PromptCard — human-in-the-loop touchpoints for blocked
 * tasks. Pinned to the bottom-left of the mission board area.
 *
 * Each blocked task surfaces as a clickbar showing the task number and
 * blocked reason. Clicking the bar expands it into a draggable
 * PromptCard with the full context plus the available actions
 * (currently CANCEL TASK · KEEP CONTEXT — rerun is bundle-level so it
 * lives on the BlockedBanner instead).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Quest } from './mapping'

export interface HitlPrompt {
  readonly id: string
  /** "#04" style label */
  readonly task: string
  /** Agent / session label, e.g. "GATEKEEPER · ses_14a" */
  readonly from: string
  readonly age: string
  readonly q: string
  /** True if the block is older than HITL_OVERDUE_MS. */
  readonly overdue: boolean
}

const HITL_OVERDUE_MS = 5 * 60 * 1000

function formatAge(iso: string | null): { label: string; ms: number } {
  if (!iso) return { label: '—', ms: 0 }
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return { label: '—', ms: 0 }
  const ms = Math.max(0, Date.now() - then)
  const s = Math.floor(ms / 1000)
  if (s < 60) return { label: `${s}s`, ms }
  const m = Math.floor(s / 60)
  if (m < 60) return { label: `${m}m ${s % 60}s`, ms }
  const h = Math.floor(m / 60)
  return { label: `${h}h ${m % 60}m`, ms }
}

/**
 * Map blocked quests to HITL prompts. `liveStartedAt` lets us age the
 * block from when the agent started working, which is what the user
 * actually cares about ("how long has this been waiting on me?").
 */
export function buildHitlPrompts(
  quests: readonly Quest[],
  agentForTask: (taskId: string) => { agentId: string; sessionId: string | null } | null,
  startedAtForTask: (taskId: string) => string | null,
): HitlPrompt[] {
  const out: HitlPrompt[] = []
  for (const q of quests) {
    if (q.status !== 'blocked') continue
    const { label: ageLabel, ms } = formatAge(startedAtForTask(q.id))
    const a = agentForTask(q.id)
    const from = a
      ? `${a.agentId.split('@')[0].toUpperCase()}${a.sessionId ? ` · ${a.sessionId.slice(0, 6)}` : ''}`
      : '—'
    out.push({
      id: q.id,
      task: `#${q.no}`,
      from,
      age: ageLabel,
      q: q.blockedReason ?? 'awaiting operator decision',
      overdue: ms >= HITL_OVERDUE_MS,
    })
  }
  return out
}

export function HITLBarStrip({
  items,
  onRestore,
}: {
  items: readonly HitlPrompt[]
  onRestore: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="sp-hitl-strip">
      {items.map((p) => (
        <div
          key={p.id}
          className={`sp-hitl-bar ${p.overdue ? 'overdue' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onRestore(p.id)
          }}
          title={`${p.from} · ${p.q}`}
        >
          <div className="sp-hb-no">{p.task.replace('#', '')}</div>
          <div className="sp-hb-msg">{p.q}</div>
          <div className="sp-hb-age">{p.age}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRestore(p.id)
            }}
            title="Open prompt card"
            style={{
              width: 18,
              height: 18,
              border: '1.5px solid var(--line)',
              background: 'var(--cream-hi)',
              cursor: 'pointer',
              fontFamily:
                "var(--font-press-start-2p), 'Press Start 2P', monospace",
              fontSize: 9,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ⇱
          </button>
        </div>
      ))}
    </div>
  )
}

export interface PromptOption {
  readonly label: string
  readonly hint: string
  readonly disabled?: boolean
  readonly onPick: () => void | Promise<void>
}

export function PromptCard({
  prompt,
  options,
  initialX,
  initialY,
  onMinimize,
  onFocus,
  z = 25,
}: {
  prompt: HitlPrompt
  options: readonly PromptOption[]
  initialX: number
  initialY: number
  onMinimize: () => void
  onFocus?: () => void
  z?: number
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  useEffect(() => {
    setPos({ x: initialX, y: initialY })
  }, [initialX, initialY])
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const onDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onFocus?.()
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
      className="sp-prompt-card"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 420,
        zIndex: z,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sp-prompt-head" onMouseDown={onDown} style={{ cursor: 'grab' }}>
        <span>⚠ DECISION · {prompt.task}</span>
        <button
          className="mini"
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onMinimize()
          }}
          title="Minimize to clickbar"
        >
          —
        </button>
      </div>
      <div className="sp-prompt-body">
        <div className="ctx">
          <div
            style={{
              fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
              fontSize: 8,
              color: 'var(--muted)',
              marginBottom: 4,
            }}
          >
            ▸ CONTEXT · from <b style={{ color: 'var(--ink)' }}>{prompt.from}</b> · {prompt.age} ago
          </div>
        </div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{prompt.q}</div>
        <div className="opts">
          {options.map((o, i) => (
            <button
              key={i}
              type="button"
              className={`sp-prompt-opt${o.disabled ? ' disabled' : ''}`}
              disabled={o.disabled}
              onClick={(e) => {
                e.stopPropagation()
                if (!o.disabled) void o.onPick()
              }}
              style={{ textAlign: 'left' }}
            >
              <div className="k">{i + 1}</div>
              <div>{o.label}</div>
              <div className="xp">{o.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
