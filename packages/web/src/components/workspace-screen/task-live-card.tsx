'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, XCircle, Loader2, Wrench, Brain, MessageCircle, X } from 'lucide-react'

import type { Event, EventType } from '@cookrew/shared'

import { joinClasses, WorkspaceBadge, buttonClassName } from './shared'
import type { TaskLiveState } from '@/hooks/use-task-stream'

/**
 * Sticky live card showing a single in-flight task's real-time state.
 *
 * Renders:
 * - Header: agent, task title, elapsed, cancel button
 * - Progress bar (from task:progress events)
 * - Step-by-step event stream (tool_use → tool_result pairs, thinking, messages)
 * - Footer: status badge
 */
export function TaskLiveCard({
  state,
  onCancel,
}: {
  readonly state: TaskLiveState
  readonly onCancel?: (taskId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const elapsed = useElapsed(state.startedAt)

  const steps = useMemo(() => buildSteps(state.events), [state.events])

  const percent = state.progress?.percent ?? null
  const progressSummary = state.progress?.summary ?? ''
  const stepLabel =
    state.progress?.step != null && state.progress.total != null
      ? `${state.progress.step}/${state.progress.total}`
      : null

  const statusTone: 'amber' | 'emerald' | 'rose' | 'blue' | 'slate' =
    state.status === 'working' || state.status === 'claimed'
      ? 'blue'
      : state.status === 'done'
        ? 'emerald'
        : state.status === 'blocked' || state.status === 'cancelled'
          ? 'rose'
          : 'slate'

  const isActive = state.status === 'claimed' || state.status === 'working'

  return (
    <div className="sticky top-4 z-10 overflow-hidden border border-[#2D2A20] bg-[#FFFEF5] shadow-[3px_3px_0_#2D2A20]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#2D2A20] bg-[#FAF5E8] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isActive ? (
              <Loader2 size={14} className="shrink-0 animate-spin text-[#D97706]" />
            ) : state.status === 'done' ? (
              <CheckCircle2 size={14} className="shrink-0 text-[#059669]" />
            ) : (
              <XCircle size={14} className="shrink-0 text-[#DC2626]" />
            )}
            <h3 className="truncate text-[14px] font-semibold text-[#2D2A20]">
              {state.title ?? state.taskId}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#57534E]">
            {state.agentId && <span className="font-mono">{state.agentId}</span>}
            {elapsed && <span>· {elapsed}</span>}
            <span className="ml-auto">
              <WorkspaceBadge label={state.status} tone={statusTone} />
            </span>
          </div>
        </div>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(state.taskId)}
            className={joinClasses(
              buttonClassName('secondary', 'sm'),
              'shrink-0 px-2 py-1',
            )}
            title="Cancel this task"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {(percent !== null || progressSummary) && (
        <div className="border-b border-[#E7E5E4] bg-[#FFFEF5] px-4 py-2">
          <div className="flex items-center justify-between text-[11px] text-[#57534E]">
            <span className="truncate">{progressSummary || 'Working…'}</span>
            <span className="ml-2 shrink-0 font-mono tabular-nums">
              {stepLabel ?? (percent != null ? `${Math.round(percent * 100)}%` : '')}
            </span>
          </div>
          {percent !== null && (
            <div className="mt-1 h-[6px] overflow-hidden border border-[#2D2A20] bg-[#FFFEF5]">
              <div
                className="h-full bg-[#FFD600] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, percent * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step feed — collapsed shows last 3 */}
      <div className="px-4 py-2">
        {steps.length === 0 ? (
          <div className="py-3 text-center text-[12px] text-[#A8A29E]">
            Waiting for first event…
          </div>
        ) : (
          <>
            <ol className="space-y-1">
              {(expanded ? steps : steps.slice(-3)).map((step, idx) => (
                <StepRow key={`${step.eventIds.join(':')}:${idx}`} step={step} />
              ))}
            </ol>
            {steps.length > 3 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 w-full text-center text-[11px] font-medium text-[#57534E] hover:text-[#2D2A20]"
              >
                {expanded ? 'Collapse' : `Show all ${steps.length} steps`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step construction & rendering
// ─────────────────────────────────────────────────────────────────────

type Step =
  | { kind: 'tool'; toolName: string; input: unknown; output: unknown; isError: boolean; eventIds: string[] }
  | { kind: 'thinking'; text: string; eventIds: string[] }
  | { kind: 'message'; text: string; eventIds: string[] }
  | { kind: 'milestone'; body: string; eventIds: string[] }

/**
 * Build a compact step list from raw events.
 *
 * Handles the three noise patterns from the codex rollout watcher:
 *   1. "Notification" agent_reply placeholders → dropped
 *   2. Consecutive duplicate agent_reply/tool_use with identical body
 *      (rollout watcher emits pre + post for each) → deduped
 *   3. tool_use "pending" + tool_use "completed ✓" hook pairs → merged
 *      into one step (same pattern group-events.ts::groupEvents uses
 *      for PreToolUse/PostToolUse in the feed)
 */
function buildSteps(events: readonly Event[]): Step[] {
  const steps: Step[] = []
  const pendingTools = new Map<string, { input: unknown; eventId: string; name: string }>()

  // Track last emitted body per step kind for consecutive-dedup.
  let lastMessageBody = ''
  let lastToolBody = ''

  for (const evt of events) {
    const type = evt.type as EventType
    const payload = (evt.payload as Record<string, unknown> | null) ?? {}

    if (type === 'tool_use') {
      const body = evt.body || ''

      // Codex hook sends the same tool_use twice: once "pending"
      // (e.g. `Bash(ls)`) then "completed" (`Bash(ls) ✓`). The
      // completed variant has a trailing ` ✓`. Merge into the
      // existing pending step instead of creating a duplicate.
      if (body.endsWith(' ✓') || body.endsWith(' ✓')) {
        const pendingBody = body.replace(/ ✓$/, '').replace(/ ✓$/, '')
        if (pendingBody === lastToolBody) {
          // Find the last tool step and mark it done.
          const lastTool = [...steps].reverse().find((s) => s.kind === 'tool')
          if (lastTool && lastTool.kind === 'tool') {
            lastTool.output = '✓'
            lastTool.eventIds.push(evt.id)
            continue
          }
        }
      }

      // Consecutive duplicate detection (identical body, no ✓).
      if (body === lastToolBody && body) continue
      lastToolBody = body

      const id = (payload.tool_use_id as string | undefined) ?? evt.id
      pendingTools.set(id, {
        input: payload.input,
        eventId: evt.id,
        name: (payload.tool_name as string | undefined) ?? 'tool',
      })
      steps.push({
        kind: 'tool',
        toolName: (payload.tool_name as string | undefined) ?? (body.split('(')[0] || 'tool'),
        input: payload.input ?? (body.includes('(') ? body.slice(body.indexOf('(') + 1, -1) : undefined) ?? undefined,
        output: undefined,
        isError: false,
        eventIds: [evt.id],
      })
    } else if (type === 'tool_result') {
      const id = (payload.tool_use_id as string | undefined) ?? ''
      const match = pendingTools.get(id)
      pendingTools.delete(id)
      const existingStep = [...steps].reverse().find(
        (s) => s.kind === 'tool' && s.eventIds.includes(match?.eventId ?? ''),
      )
      if (existingStep && existingStep.kind === 'tool') {
        existingStep.output = payload.output
        existingStep.isError = Boolean(payload.is_error)
        existingStep.eventIds.push(evt.id)
      } else {
        steps.push({
          kind: 'tool',
          toolName: 'unknown',
          input: undefined,
          output: payload.output,
          isError: Boolean(payload.is_error),
          eventIds: [evt.id],
        })
      }
    } else if (type === 'thinking') {
      const text = (payload.text as string | undefined) ?? evt.body
      steps.push({ kind: 'thinking', text, eventIds: [evt.id] })
    } else if (type === 'agent_reply') {
      const text = (payload.text as string | undefined) ?? evt.body

      // Drop empty "Notification" placeholders (codex hook artifact).
      if (!text || text === 'Notification') continue

      // Consecutive duplicate detection.
      if (text === lastMessageBody) continue
      lastMessageBody = text

      steps.push({ kind: 'message', text, eventIds: [evt.id] })
    } else if (type === 'milestone') {
      steps.push({ kind: 'milestone', body: evt.body, eventIds: [evt.id] })
    }
    // session_start / session_end / plan / prompt / task_working
    // omitted — shown in event feed instead.
  }

  return steps
}

function StepRow({ step }: { readonly step: Step }) {
  if (step.kind === 'tool') {
    const summary = summarizeToolInput(step.input)
    return (
      <li className="flex items-start gap-2 text-[12px]">
        <Wrench
          size={12}
          className={joinClasses(
            'mt-[3px] shrink-0',
            step.isError ? 'text-[#DC2626]' : 'text-[#5A9A8A]',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] font-semibold text-[#2D2A20]">
              {step.toolName}
            </span>
            {summary && <span className="truncate text-[#57534E]">{summary}</span>}
          </div>
          {step.output !== undefined && (
            <div
              className={joinClasses(
                'mt-[2px] truncate font-mono text-[10px]',
                step.isError ? 'text-[#DC2626]' : 'text-[#78716C]',
              )}
            >
              → {step.isError ? 'error: ' : ''}
              {truncate(String(step.output ?? '(ok)'), 80)}
            </div>
          )}
        </div>
      </li>
    )
  }

  if (step.kind === 'thinking') {
    return (
      <li className="flex items-start gap-2 text-[12px]">
        <Brain size={12} className="mt-[3px] shrink-0 text-[#9333EA]" />
        <span className="truncate italic text-[#78716C]">
          {truncate(step.text, 120)}
        </span>
      </li>
    )
  }

  if (step.kind === 'message') {
    return (
      <li className="flex items-start gap-2 text-[12px]">
        <MessageCircle size={12} className="mt-[3px] shrink-0 text-[#3B82F6]" />
        <span className="text-[#2D2A20]">{truncate(step.text, 200)}</span>
      </li>
    )
  }

  // milestone
  return (
    <li className="flex items-start gap-2 text-[12px]">
      <Activity size={12} className="mt-[3px] shrink-0 text-[#D97706]" />
      <span className="text-[#2D2A20]">{truncate(step.body, 200)}</span>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function summarizeToolInput(input: unknown): string {
  if (!input) return ''
  if (typeof input === 'string') return truncate(input, 60)
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>
    // Common fields: command, file_path, pattern, query
    const preferred = ['command', 'file_path', 'pattern', 'query', 'path', 'url']
    for (const key of preferred) {
      if (typeof obj[key] === 'string') return truncate(obj[key] as string, 60)
    }
    // Fallback: stringify first key/value
    const firstKey = Object.keys(obj)[0]
    if (firstKey) {
      const v = obj[firstKey]
      return truncate(`${firstKey}=${typeof v === 'string' ? v : JSON.stringify(v)}`, 60)
    }
  }
  return truncate(String(input), 60)
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function useElapsed(startedAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  if (!startedAt) return null

  const started = new Date(startedAt).getTime()
  const diffSec = Math.max(0, Math.floor((now - started) / 1000))
  if (diffSec < 60) return `${diffSec}s`
  const min = Math.floor(diffSec / 60)
  const sec = diffSec % 60
  if (min < 60) return `${min}m ${sec}s`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}
