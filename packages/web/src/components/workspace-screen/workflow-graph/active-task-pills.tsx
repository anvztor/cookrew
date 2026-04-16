'use client'

/**
 * Sticky strip of pills, one per in-flight task in the selected bundle.
 *
 * Replaces the at-a-glance "what's running" affordance that the legacy
 * sticky TaskLiveFeed provided, but in a much smaller footprint that
 * doesn't duplicate the WorkflowGraphCard's per-node telemetry.
 *
 * One pill per task with status === 'claimed' | 'working'. Each pill
 * shows a spinner, the task title, and a 1Hz elapsed timer. Clicking
 * a pill opens the same TaskExpandOverlay the graph nodes use.
 *
 * If no task is live, the strip renders nothing — consumer can keep
 * the slot in JSX without a guard.
 */

import { memo, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import type { TaskLiveState } from '@/hooks/use-task-stream'
import { useWorkflowFeed } from '../workflow-feed-context'

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['claimed', 'working'])

function formatElapsed(startedAt: string | null, now: number): string | null {
  if (!startedAt) return null
  const diff = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  if (diff < 60) return `${diff}s`
  const m = Math.floor(diff / 60)
  const s = diff % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

const ActiveTaskPill = memo(function ActiveTaskPill({
  state,
  onClick,
}: {
  readonly state: TaskLiveState
  readonly onClick: () => void
}) {
  // 1Hz tick so the elapsed counter updates while the pill is mounted.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = formatElapsed(state.startedAt, now)
  const title = state.title ?? state.taskId

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={`Open ${title} (running ${elapsed ?? '—'})`}
      className="
        inline-flex items-center gap-1.5
        border border-[#2D2A20] bg-[#DBEAFE]
        px-2 py-1 text-[11px] font-medium text-[#1D4ED8]
        shadow-[2px_2px_0_#2D2A20]
        transition-transform hover:-translate-y-px
        focus:outline-none focus:ring-2 focus:ring-[#9333EA]
      "
    >
      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
      <span className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
        {truncate(title, 28)}
      </span>
      {elapsed && (
        <span className="font-mono text-[10px] text-[#1D4ED8]/70">· {elapsed}</span>
      )}
    </button>
  )
})

export function ActiveTaskPills() {
  const { liveStates, onExpandTask } = useWorkflowFeed()

  const active = useMemo(() => {
    return Object.values(liveStates)
      .filter((s) => ACTIVE_STATUSES.has(s.status))
      .sort((a, b) => {
        // Working > claimed (closer to the user's attention), then by
        // most recently started.
        const aWorking = a.status === 'working' ? 0 : 1
        const bWorking = b.status === 'working' ? 0 : 1
        if (aWorking !== bWorking) return aWorking - bWorking
        const aStart = a.startedAt ? new Date(a.startedAt).getTime() : 0
        const bStart = b.startedAt ? new Date(b.startedAt).getTime() : 0
        return bStart - aStart
      })
  }, [liveStates])

  if (active.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Active tasks"
      className="
        flex flex-wrap items-center gap-1.5
        border-b border-[#2D2A20] bg-[#FAF5E8]
        px-3 py-1.5
      "
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#57534E]">
        {active.length === 1 ? 'Active' : `Active · ${active.length}`}
      </span>
      {active.map((state) => (
        <ActiveTaskPill
          key={state.taskId}
          state={state}
          onClick={() => onExpandTask?.(state.taskId)}
        />
      ))}
    </div>
  )
}
