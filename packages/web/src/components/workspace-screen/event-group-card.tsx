'use client'

import { useState } from 'react'
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  MessageSquare,
  PlayCircle,
  StopCircle,
  Terminal,
  Wrench,
} from 'lucide-react'
import { formatRelativeTime, formatTimestamp } from '@cookrew/shared'
import { EventCard } from './event-card'
import { joinClasses, WorkspaceEventBadge } from './shared'
import type { Event } from '@cookrew/shared'
import type { EventGroup } from './group-events'
import type { WorkspaceTone } from './types'

function hookField<T = unknown>(event: Event, key: string): T | undefined {
  const payload = event.payload as Record<string, unknown>
  return payload?.[key] as T | undefined
}

function toolNameOf(event: Event | null): string {
  if (!event) return ''
  const t = hookField<string>(event, 'tool_name')
  return typeof t === 'string' ? t : ''
}

function toolInputOf(event: Event | null): Record<string, unknown> {
  if (!event) return {}
  const raw = hookField<Record<string, unknown>>(event, 'tool_input')
  return typeof raw === 'object' && raw !== null ? raw : {}
}

function shortTarget(input: Record<string, unknown>): string {
  for (const key of ['file_path', 'path', 'command', 'pattern', 'query', 'url']) {
    const v = input[key]
    if (typeof v === 'string' && v) {
      return v.length > 120 ? v.slice(0, 117) + '…' : v
    }
  }
  return ''
}

function sourceLabel(event: Event | null): string {
  if (!event) return ''
  const s = hookField<string>(event, '_source')
  return typeof s === 'string' ? s : ''
}

function sessionShort(event: Event): string {
  const sid = hookField<string>(event, 'session_id') ?? ''
  return sid.slice(0, 12)
}

function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.round((ms % 60_000) / 1000)
  return sec > 0 ? `${min}m${sec}s` : `${min}m`
}

const SOURCE_TONE: Record<string, string> = {
  codex: 'bg-[#FEF3C7] text-[#92400E]',
  claude: 'bg-[#EDE9FE] text-[#5B21B6]',
  cursor: 'bg-[#DBEAFE] text-[#1E40AF]',
  gemini: 'bg-[#DCFCE7] text-[#166534]',
  opencode: 'bg-[#FFE4E6] text-[#9F1239]',
}

function SourceTag({ source }: { readonly source: string }) {
  if (!source) return null
  const cls = SOURCE_TONE[source] ?? 'bg-[#E7E5E4] text-[#44403C]'
  return (
    <span className={joinClasses('rounded px-1.5 py-0.5 font-mono text-[10px]', cls)}>
      {source}
    </span>
  )
}

function IndexTag({
  index,
  turn,
}: {
  readonly index: number
  readonly turn: number
}) {
  if (!index) return null
  return (
    <span
      className="font-mono text-[10px] text-[#A8A29E]"
      title={`event #${index} · turn ${turn}`}
    >
      #{index}
    </span>
  )
}

function TimeStamp({ value }: { readonly value: string }) {
  return (
    <span
      className="text-[11px] text-[#57534E]"
      title={formatTimestamp(value)}
    >
      {formatRelativeTime(value)}
    </span>
  )
}

/** Dispatch a grouped event to its specialized renderer. */
export function EventGroupCard({ group }: { readonly group: EventGroup }) {
  if (group.kind === 'card') {
    return <EventCard event={group.event} index={group.index} turn={group.turn} />
  }
  if (group.kind === 'tool-call') {
    return (
      <ToolCallCard
        pre={group.pre}
        post={group.post}
        durationMs={group.durationMs}
        index={group.index}
        turn={group.turn}
      />
    )
  }
  if (group.kind === 'thinking') {
    return (
      <ThinkingCard
        source={group.source}
        events={group.events}
        index={group.index}
        turn={group.turn}
      />
    )
  }
  if (group.kind === 'session-boundary') {
    return <SessionBoundaryCard event={group.event} />
  }
  if (group.kind === 'turn-divider') {
    return (
      <TurnDivider
        turn={group.turn}
        startedAt={group.startedAt}
        prompt={group.prompt}
      />
    )
  }
  return null
}

// ─────────────────────────────────────────────────────────
// tool-call — paired PreToolUse + PostToolUse
// ─────────────────────────────────────────────────────────
function ToolCallCard({
  pre,
  post,
  durationMs,
  index,
  turn,
}: {
  readonly pre: Event | null
  readonly post: Event | null
  readonly durationMs: number | null
  readonly index: number
  readonly turn: number
}) {
  const anchor = pre ?? post!
  const tool = toolNameOf(anchor)
  const input = toolInputOf(anchor)
  const source = sourceLabel(anchor)
  const target = shortTarget(input)
  const outputPreview = post ? hookField<string>(post, '_output_preview') ?? '' : ''

  const status: 'pending' | 'ok' | 'fail' =
    post == null ? 'pending' :
    (hookField<string>(post, 'hook_event_name') === 'PostToolUseFailure' ||
     (post.body || '').trimEnd().endsWith('✗'))
      ? 'fail'
      : 'ok'

  const tone: WorkspaceTone =
    status === 'fail' ? 'rose' : status === 'ok' ? 'emerald' : 'blue'

  const Icon = status === 'fail' ? CircleAlert : status === 'ok' ? Terminal : status === 'pending' ? LoaderCircle : Wrench
  const label = status === 'pending' ? 'tool:running' : status === 'fail' ? 'tool:failed' : 'tool:done'
  const durationLabel = formatDuration(durationMs)
  // Failed calls auto-expand so the user sees the error immediately.
  const [expanded, setExpanded] = useState(status === 'fail')

  return (
    <article
      className={joinClasses(
        'flex flex-col gap-2 border bg-[#FFFEF5] px-[14px] py-[14px]',
        status === 'fail'
          ? 'border-l-[3px] border-l-[#B91C1C] border-[#2D2A20]'
          : 'border-[#2D2A20]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceEventBadge
            icon={Icon}
            label={label}
            tone={tone}
          />
          <span className="font-mono text-[13px] font-semibold text-[#2D2A20]">
            {tool || 'Tool'}
          </span>
          <SourceTag source={source} />
          {durationLabel ? (
            <span
              className="rounded bg-[#F5F5F4] px-1.5 py-0.5 font-mono text-[10px] text-[#57534E]"
              title="duration: pre→post"
            >
              {durationLabel}
            </span>
          ) : null}
          <IndexTag index={index} turn={turn} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="p-0.5 text-[#57534E] hover:text-[#2D2A20]"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <TimeStamp value={anchor.created_at} />
        </div>
      </div>

      {target ? (
        <p className="line-clamp-2 whitespace-pre-wrap break-all font-mono text-[12px] leading-[1.45] text-[#57534E]">
          {target}
        </p>
      ) : null}

      {/* Inline output preview (collapsed view): 2 lines so users get
          a sense of result without having to expand every card. */}
      {!expanded && outputPreview ? (
        <pre
          className={joinClasses(
            'line-clamp-2 whitespace-pre-wrap break-all rounded border px-2 py-1 font-mono text-[11px] leading-[1.4]',
            status === 'fail'
              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#7F1D1D]'
              : 'border-[#E7E5E4] bg-[#F8F7F2] text-[#44403C]'
          )}
        >
          {outputPreview}
        </pre>
      ) : null}

      {expanded ? <ToolCallDetails pre={pre} post={post} /> : null}
    </article>
  )
}

function ToolCallDetails({
  pre,
  post,
}: {
  readonly pre: Event | null
  readonly post: Event | null
}) {
  const anchor = pre ?? post!
  const input = toolInputOf(anchor)
  const rows: Array<{ label: string; value: string }> = []
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && v) {
      rows.push({ label: k, value: v.length > 240 ? v.slice(0, 237) + '…' : v })
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      rows.push({ label: k, value: String(v) })
    }
  }
  const preview = post ? hookField<string>(post, '_output_preview') ?? '' : ''
  const callId = hookField<string>(anchor, '_codex_call_id') ?? ''

  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-[#E7E5E4] pt-2">
      {rows.length > 0 ? (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px] text-[#57534E]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-[#A8A29E]">{row.label}</dt>
              <dd className="whitespace-pre-wrap break-all text-[#2D2A20]">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {preview ? (
        <div className="font-mono text-[11px] text-[#57534E]">
          <div className="text-[#A8A29E]">output preview</div>
          <pre className="mt-0.5 whitespace-pre-wrap break-all text-[#2D2A20]">{preview}</pre>
        </div>
      ) : null}
      {callId ? (
        <div className="font-mono text-[10px] text-[#A8A29E]">call_id: {callId}</div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// thinking — collapsed reasoning bundle
// ─────────────────────────────────────────────────────────
function ThinkingCard({
  source,
  events,
  index,
  turn,
}: {
  readonly source: string
  readonly events: readonly Event[]
  readonly index: number
  readonly turn: number
}) {
  const [expanded, setExpanded] = useState(false)
  const first = events[0]

  const summaries = events
    .map((e) => {
      const summary = hookField<string>(e, 'summary')
      if (typeof summary === 'string' && summary.trim()) return summary
      const body = (e.body || '').trim()
      // Skip the literal "Notification" placeholder body — it's not
      // useful content, just an artifact of unparsed reasoning items.
      if (body && body !== 'Notification') return body
      return ''
    })
    .filter((s) => s && s.trim().length > 0)

  const firstLine = summaries[0]?.split('\n')[0] ?? ''
  const count = events.length

  return (
    <article className="flex flex-col gap-2 border border-dashed border-[#C7BF9F] bg-[#FFFBEB] px-[14px] py-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceEventBadge
            icon={Brain}
            label={`thinking · ${count}`}
            tone="amber"
          />
          <SourceTag source={source} />
          <IndexTag index={index} turn={turn} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[11px] text-[#57534E] hover:text-[#2D2A20]"
            aria-label={expanded ? 'Collapse thinking' : 'Expand thinking'}
          >
            {expanded ? 'hide' : 'show'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <TimeStamp value={first.created_at} />
        </div>
      </div>
      {!expanded ? (
        firstLine ? (
          <p className="line-clamp-2 whitespace-pre-wrap text-[12px] italic leading-[1.45] text-[#57534E]">
            {firstLine}
          </p>
        ) : (
          <p className="text-[11px] italic text-[#A8A29E]">
            {count === 1 ? 'reasoning step' : `${count} reasoning steps`} (no summary)
          </p>
        )
      ) : (
        <div className="flex flex-col gap-2 border-t border-[#E7E5E4] pt-2">
          {summaries.length > 0 ? (
            summaries.map((s, i) => (
              <p
                key={`${first.id}-${i}`}
                className="whitespace-pre-wrap text-[12px] italic leading-[1.45] text-[#57534E]"
              >
                {s}
              </p>
            ))
          ) : (
            <p className="text-[11px] italic text-[#A8A29E]">
              Reasoning content was redacted or empty.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────
// turn-divider — visual separator for each user prompt
// ─────────────────────────────────────────────────────────
function TurnDivider({
  turn,
  startedAt,
  prompt,
}: {
  readonly turn: number
  readonly startedAt: string
  readonly prompt: string
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t-[2px] border-[#2D2A20] bg-[#FFFEF5] px-[14px] pb-3 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#2D2A20] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFFEF5]">
            Turn {turn}
          </span>
          <MessageSquare size={14} className="text-[#9333EA]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">
            user prompt
          </span>
        </div>
        <TimeStamp value={startedAt} />
      </div>
      {prompt ? (
        <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-[#2D2A20]">
          {prompt}
        </p>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// session-boundary — thin horizontal rule with session id
// ─────────────────────────────────────────────────────────
function SessionBoundaryCard({ event }: { readonly event: Event }) {
  const isStart = event.type === 'session_start'
  const Icon = isStart ? PlayCircle : StopCircle
  const sid = sessionShort(event)
  const source = sourceLabel(event)
  const cwd = hookField<string>(event, 'cwd') ?? ''

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[#D6D3D1]" />
      <div className="flex items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FFFBEB] px-3 py-1 text-[11px] text-[#57534E]">
        <Icon size={12} className="text-[#A8A29E]" />
        <span className="font-mono">
          {isStart ? 'session start' : 'session end'}
        </span>
        {source ? (
          <span className="rounded bg-[#FEF3C7] px-1 font-mono text-[10px] text-[#92400E]">
            {source}
          </span>
        ) : null}
        {sid ? (
          <span className="font-mono text-[10px] text-[#A8A29E]">{sid}</span>
        ) : null}
        {cwd ? (
          <span
            className="max-w-[280px] truncate font-mono text-[10px] text-[#A8A29E]"
            title={cwd}
          >
            {cwd}
          </span>
        ) : null}
      </div>
      <div className="h-px flex-1 bg-[#D6D3D1]" />
    </div>
  )
}

export { joinClasses }
