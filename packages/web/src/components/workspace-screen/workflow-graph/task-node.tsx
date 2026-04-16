'use client'

/**
 * Compact graph node for the WorkflowGraphCard.
 *
 * Renders one task as ~92x240px:
 *   row 1: status icon + title (truncated)
 *   row 2: agent · elapsed
 *   row 3: last event body (truncated)  OR  progress bar if active
 *
 * Inline buttons:
 *   - Cancel (X) when status is claimed/working
 *   - Rerun (↻) when status is blocked/cancelled
 * Click anywhere else on the body → onExpand(taskId).
 *
 * Status background colors come from STATUS_BG; keep in sync with the
 * status palette used by the existing TaskLiveCard.
 */

import { memo, useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { CheckCircle2, Loader2, RefreshCw, X, XCircle } from 'lucide-react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import type { TaskNodeData } from './types'
import {
  GRAPH_LAYOUT_NODE_HEIGHT,
  GRAPH_LAYOUT_NODE_WIDTH,
} from './use-graph-layout'

const STATUS_BG: Record<string, string> = {
  done: '#D1FAE5',
  working: '#DBEAFE',
  claimed: '#DBEAFE',
  blocked: '#FEE2E2',
  cancelled: '#FEE2E2',
  open: '#FAF5E8',
}

const STATUS_FG: Record<string, string> = {
  done: '#059669',
  working: '#1D4ED8',
  claimed: '#1D4ED8',
  blocked: '#DC2626',
  cancelled: '#DC2626',
  open: '#A8A29E',
}

const HANDLE_STYLE: CSSProperties = {
  background: '#2D2A20',
  width: 6,
  height: 6,
  border: 'none',
}

function formatElapsed(startedAt: string | null, completedAt: string | null, now: number): string | null {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : now
  const diff = Math.max(0, Math.floor((end - start) / 1000))
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

function lastEventBody(events: ReadonlyArray<{ body: string; type: string }>): string {
  // Walk backward, skip empty Notification placeholders.
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    const b = (ev.body || '').trim()
    if (!b || b === 'Notification') continue
    return b
  }
  return ''
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <CheckCircle2 size={12} style={{ color: STATUS_FG.done, flexShrink: 0 }} />
  }
  if (status === 'working' || status === 'claimed') {
    return <Loader2 size={12} className="animate-spin" style={{ color: STATUS_FG.working, flexShrink: 0 }} />
  }
  if (status === 'blocked' || status === 'cancelled') {
    return <XCircle size={12} style={{ color: STATUS_FG.blocked, flexShrink: 0 }} />
  }
  return null
}

function TaskNodeBase({ data }: NodeProps) {
  const { task, liveState, onExpand, onCancel, onRerun, isExpanded } = data as TaskNodeData
  const status = task.status
  const bg = STATUS_BG[status] ?? '#FFFEF5'
  const isActive = status === 'claimed' || status === 'working'
  const isStuck = status === 'blocked' || status === 'cancelled'

  // 1Hz tick for elapsed time when active; static otherwise.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isActive])

  const elapsed = formatElapsed(
    liveState?.startedAt ?? null,
    liveState?.completedAt ?? null,
    now,
  )

  const lastBody = liveState ? lastEventBody(liveState.events) : ''
  const progress = liveState?.progress

  const handleNodeClick = () => onExpand?.(task.id)
  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      onClick={handleNodeClick}
      style={{
        width: GRAPH_LAYOUT_NODE_WIDTH,
        height: GRAPH_LAYOUT_NODE_HEIGHT,
        background: bg,
        border: `1px solid ${isExpanded ? '#9333EA' : '#2D2A20'}`,
        boxShadow: isExpanded ? '3px 3px 0 #9333EA' : '2px 2px 0 #2D2A20',
        padding: '6px 8px',
        fontFamily: 'ui-sans-serif, system-ui',
        fontSize: 12,
        color: '#2D2A20',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'relative',
        userSelect: 'none',
      }}
      role="button"
      tabIndex={0}
      aria-label={`Task ${task.title}, status ${status}`}
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />

      {/* Row 1: status icon + title + inline action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <StatusIcon status={status} />
        <span
          style={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            flex: 1,
            minWidth: 0,
          }}
        >
          {task.title || task.id}
        </span>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              onCancel(task.id)
            }}
            title="Cancel this task"
            aria-label={`Cancel ${task.title}`}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: STATUS_FG.blocked,
              flexShrink: 0,
            }}
          >
            <X size={12} />
          </button>
        )}
        {isStuck && onRerun && (
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              onRerun(task.id)
            }}
            title="Re-run this task"
            aria-label={`Re-run ${task.title}`}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: STATUS_FG.working,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Row 2: agent · elapsed */}
      <div
        style={{
          fontSize: 10,
          color: '#57534E',
          display: 'flex',
          gap: 6,
          minWidth: 0,
        }}
      >
        {liveState?.agentId && (
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              maxWidth: '60%',
            }}
          >
            {liveState.agentId}
          </span>
        )}
        {elapsed && <span>· {elapsed}</span>}
      </div>

      {/* Row 3: progress bar (if active + progress data) OR last event body */}
      {isActive && progress?.percent != null ? (
        <div
          style={{
            height: 4,
            border: '1px solid #2D2A20',
            background: '#FFFEF5',
            overflow: 'hidden',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress.percent * 100))}%`,
              height: '100%',
              background: '#FFD600',
              transition: 'width 500ms ease',
            }}
          />
        </div>
      ) : lastBody ? (
        <div
          style={{
            fontSize: 10,
            color: '#78716C',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            marginTop: 'auto',
          }}
        >
          {truncate(lastBody, 40)}
        </div>
      ) : null}

      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  )
}

/** Memoized to avoid re-rendering nodes whose data hasn't changed.
 *  ReactFlow passes a stable data reference when our useMemo upstream
 *  is stable, so identity comparison is enough. */
export const TaskNode = memo(TaskNodeBase)
