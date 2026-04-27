/**
 * TaskLiveCard — phosphor overlay showing a single task's live events.
 *
 * Opens when a quest card on the MissionBoard is clicked. Renders:
 *   - Task title, status, agent, elapsed time
 *   - Progress summary + step/total bar (if task:progress events arrive)
 *   - Event stream: tool_use ↔ tool_result pairs, thinking, agent_reply,
 *     session_start, session_end, milestone
 *   - CANCEL button (calls cancelTask when working/claimed)
 *
 * Driven entirely from the `TaskLiveState` aggregated by useTaskStream.
 * No mocking — if the task has no live state yet (e.g. bundle loaded
 * from cold), the card still shows static metadata and an empty-state
 * message.
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Event, EventPayload } from '@cookrew/shared'
import { cancelTask } from '@/lib/api'
import type { TaskLiveState } from '@/hooks/use-task-stream'
import type { Quest } from './mapping'

type EventLine = {
  id: string
  t: string
  kind:
    | 'session_start'
    | 'session_end'
    | 'tool_use'
    | 'tool_result'
    | 'thinking'
    | 'agent_reply'
    | 'milestone'
    | 'other'
  body: string
  is_error?: boolean
}

const KIND_COLOR: Record<EventLine['kind'], string> = {
  session_start: 'var(--phos-glow)',
  session_end: '#6BCF88',
  tool_use: '#7AC4E5',
  tool_result: '#E9B949',
  thinking: '#BFA3E0',
  agent_reply: 'var(--phos-glow)',
  milestone: '#6BCF88',
  other: 'var(--phos)',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'OPEN',
  claimed: 'CLAIMED',
  working: 'WORKING',
  done: 'CLEARED',
  blocked: 'BLOCKED',
  cancelled: 'CANCELLED',
}

function summarizeEvent(ev: Event): EventLine {
  const p = ev.payload as EventPayload | null
  const t = fmtTime(ev.created_at)
  if (p) {
    if (p.kind === 'session_start') {
      return {
        id: ev.id,
        t,
        kind: 'session_start',
        body: `▶ ${p.agent_name}${p.model ? ` · ${p.model}` : ''}`,
      }
    }
    if (p.kind === 'session_end') {
      return {
        id: ev.id,
        t,
        kind: 'session_end',
        body: p.success
          ? `■ done · ${p.duration_ms ?? '?'}ms${p.cost_usd ? ` · $${p.cost_usd.toFixed(3)}` : ''}`
          : `■ fail · ${p.blocked_reason ?? 'error'}`,
        is_error: !p.success,
      }
    }
    if (p.kind === 'tool_use') {
      const input = p.input as Record<string, unknown> | null | undefined
      const primary =
        (input && (input.command ?? input.file_path ?? input.path ?? input.query ?? input.description)) || ''
      const hint = typeof primary === 'string' ? primary.split('\n')[0].slice(0, 60) : ''
      return { id: ev.id, t, kind: 'tool_use', body: `${p.tool_name}(${hint})` }
    }
    if (p.kind === 'tool_result') {
      return {
        id: ev.id,
        t,
        kind: 'tool_result',
        body: p.is_error ? `→ error` : `→ ${String(p.output).slice(0, 80).replace(/\s+/g, ' ')}`,
        is_error: p.is_error,
      }
    }
    if (p.kind === 'thinking') {
      return { id: ev.id, t, kind: 'thinking', body: `… ${p.text.slice(0, 100)}` }
    }
    if (p.kind === 'agent_reply') {
      return { id: ev.id, t, kind: 'agent_reply', body: p.text.slice(0, 120) }
    }
  }
  if (ev.type === 'milestone') {
    return { id: ev.id, t, kind: 'milestone', body: `✓ ${ev.body.slice(0, 120)}` }
  }
  return { id: ev.id, t, kind: 'other', body: ev.body.slice(0, 120) || `[${ev.type}]` }
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  } catch {
    return iso.slice(11, 19)
  }
}

function fmtElapsed(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '—'
  try {
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const ms = Math.max(0, end - start)
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const r = s % 60
    if (m < 60) return `${m}m ${r}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  } catch {
    return '—'
  }
}

export function TaskLiveCard({
  quest,
  liveState,
  onClose,
}: {
  quest: Quest
  liveState: TaskLiveState | null
  onClose: () => void
}) {
  const [cancelling, setCancelling] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const lines = useMemo<EventLine[]>(
    () => (liveState?.events ?? []).map(summarizeEvent),
    [liveState?.events],
  )

  const status = liveState?.status ?? mapQuestToTaskStatus(quest.status)
  const isLive = status === 'working' || status === 'claimed'
  const canCancel = isLive

  const doCancel = async () => {
    if (!canCancel || cancelling) return
    setCancelling(true)
    setErr(null)
    try {
      await cancelTask(quest.id)
      // Leave the card open — the watch stream will flip status to cancelled.
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }

  const progress = liveState?.progress ?? null
  const elapsed = fmtElapsed(liveState?.startedAt ?? null, liveState?.completedAt ?? null)

  // Auto-scroll to bottom on new lines — card is fixed-height now, so
  // latest events would otherwise fall below the fold.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines.length])

  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        width: 460,
        height: 'min(65vh, 540px)',
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
      }}
      className="pc-phos-screen pc-crt"
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(233,185,73,0.35)',
          background: 'rgba(233,185,73,0.08)',
          position: 'relative',
          zIndex: 4,
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="pc-silk pc-phos-hi"
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ▮ QUEST #{quest.no} · {quest.id.slice(0, 12)}
          </div>
          <div
            className="pc-phos"
            style={{
              fontSize: 12,
              marginTop: 2,
              fontFamily:
                "var(--font-vt323), 'VT323', monospace",
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={quest.title}
          >
            {quest.title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          style={{
            background: 'transparent',
            border: '1px solid var(--phos-dim)',
            color: 'var(--phos)',
            padding: '2px 8px',
            fontFamily:
              "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 10,
            cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          ×
        </button>
      </div>

      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderBottom: '1px solid rgba(233,185,73,0.25)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--phos)',
          position: 'relative',
          zIndex: 4,
          flexShrink: 0,
        }}
      >
        <span className="pc-phos-hi">{STATUS_LABEL[status] ?? status.toUpperCase()}</span>
        <span className="pc-phos-dim">·</span>
        <span>@{quest.assignee}</span>
        <span className="pc-phos-dim">·</span>
        <span>{elapsed}</span>
        <span style={{ flex: 1 }} />
        {canCancel && (
          <button
            type="button"
            onClick={() => void doCancel()}
            disabled={cancelling}
            style={{
              background: cancelling ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.35)',
              border: '1px solid #FF9A6B',
              color: '#FFCFB8',
              padding: '2px 10px',
              fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
              fontSize: 9,
              cursor: cancelling ? 'wait' : 'pointer',
              letterSpacing: 1,
            }}
          >
            {cancelling ? '…' : '✗ CANCEL'}
          </button>
        )}
      </div>

      {/* Progress row */}
      {progress && (
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid rgba(233,185,73,0.2)',
            position: 'relative',
            zIndex: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily:
                "var(--font-silkscreen), 'Silkscreen', monospace",
              fontSize: 9,
              color: 'var(--phos-dim)',
              marginBottom: 4,
            }}
          >
            <span className="pc-phos">
              ▸ PROGRESS
              {progress.step != null && progress.total != null
                ? ` · ${progress.step}/${progress.total}`
                : ''}
            </span>
            {progress.percent != null && (
              <span className="pc-phos-hi">{Math.round(progress.percent)}%</span>
            )}
          </div>
          {progress.summary && (
            <div
              style={{
                fontFamily: "var(--font-vt323), 'VT323', monospace",
                fontSize: 13,
                color: 'var(--phos)',
                lineHeight: 1.3,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={progress.summary}
            >
              {progress.summary}
            </div>
          )}
          {progress.percent != null && (
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'rgba(233,185,73,0.15)',
                border: '1px solid var(--phos-dim)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                  background: 'var(--phos-glow)',
                  transition: 'width 300ms linear',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Fixed-size scroll area — stops the card from growing upward
          as events stream in (was the flicker source). */}
      <div
        ref={scrollRef}
        className="pc-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '8px 12px',
          fontFamily: "var(--font-vt323), 'VT323', monospace",
          fontSize: 13,
          lineHeight: 1.35,
          position: 'relative',
          zIndex: 4,
        }}
      >
        {lines.length === 0 && (
          <div className="pc-phos-dim" style={{ fontSize: 13, opacity: 0.7 }}>
            {isLive
              ? 'Connected — waiting for first event…'
              : status === 'done'
                ? 'No event stream available (task completed before events were captured).'
                : 'No events yet.'}
          </div>
        )}
        {lines.map((l) => (
          <div key={l.id} style={{ marginBottom: 4 }}>
            <span className="pc-phos-dim">[{l.t}]</span>{' '}
            <span style={{ color: l.is_error ? '#FF9A6B' : (KIND_COLOR[l.kind] ?? 'var(--phos)') }}>
              {l.body}
            </span>
          </div>
        ))}
        {isLive && (
          <div className="pc-cursor pc-phos-hi" style={{ fontSize: 14 }}>
            $&nbsp;
          </div>
        )}
      </div>

      {/* Error */}
      {err && (
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid #FF9A6B',
            background: 'rgba(220,38,38,0.25)',
            color: '#FFCFB8',
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 11,
            position: 'relative',
            zIndex: 4,
            flexShrink: 0,
          }}
        >
          ⚠ {err}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: '4px 10px',
          borderTop: '1px solid rgba(233,185,73,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily:
            "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--phos-dim)',
          position: 'relative',
          zIndex: 4,
          flexShrink: 0,
        }}
      >
        <span>{lines.length} EVTS · SSE</span>
        <span>ESC TO CLOSE</span>
      </div>
    </div>
  )
}

function mapQuestToTaskStatus(q: Quest['status']): string {
  if (q === 'locked') return 'open'
  return q
}
