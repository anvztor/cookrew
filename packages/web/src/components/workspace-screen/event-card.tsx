'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatRelativeTime, formatTimestamp } from '@cookrew/shared'
import { getEventPresentation } from './helpers'
import { joinClasses, WorkspaceEventBadge } from './shared'
import { SessionPill } from './session-pill'
import { ShellOutput } from './shell-output'
import { ThinkingBlock } from './thinking-block'
import { ToolCallCard } from './tool-call-card'
import { ToolResultCard } from './tool-result-card'
import type { Event } from '@cookrew/shared'

const SOURCE_TONE: Record<string, string> = {
  codex: 'bg-[#FEF3C7] text-[#92400E]',
  claude: 'bg-[#EDE9FE] text-[#5B21B6]',
  cursor: 'bg-[#DBEAFE] text-[#1E40AF]',
  gemini: 'bg-[#DCFCE7] text-[#166534]',
  opencode: 'bg-[#FFE4E6] text-[#9F1239]',
}

/** Body length beyond which we show the expand/collapse toggle. */
const COLLAPSE_THRESHOLD = 200

function isAgentOutput(event: Event): boolean {
  return event.type === 'milestone' && event.actorType === 'agent'
}

function isHookEvent(event: Event): boolean {
  return event.actorType === 'hook'
}

function hookSourceLabel(event: Event): string | null {
  if (!isHookEvent(event)) return null
  const source = event.payload?._source
  return typeof source === 'string' ? source : null
}

/**
 * Resolve the body to display for an event.
 *
 * Codex agent_reply hooks (and any other Notification-derived hook
 * event from a non-tool source) historically land with the literal
 * body "Notification" — the actual prose lives in
 * `payload.last_assistant_message`. The bridge `_build_body` fix
 * makes new events come through with the message inline, but old
 * rows in the krewhub events table still have body="Notification".
 *
 * Falling back here means we render the right thing regardless of
 * when the event was ingested.
 */
function displayBody(event: Event): string {
  const body = event.body || ''
  const trimmed = body.trim()
  if (trimmed && trimmed !== 'Notification') return body
  const payload = event.payload as Record<string, unknown> | null | undefined
  const msg = payload?.last_assistant_message
  if (typeof msg === 'string' && msg.trim()) return msg
  const summary = payload?.summary
  if (typeof summary === 'string' && summary.trim()) return summary
  return body
}

export function EventCard({
  event,
  index = 0,
  turn = 0,
}: {
  readonly event: Event
  readonly index?: number
  readonly turn?: number
}) {
  const presentation = getEventPresentation(event)
  const agentOutput = isAgentOutput(event)
  const hook = isHookEvent(event)
  const source = hookSourceLabel(event)
  const body = displayBody(event)
  const isLong = !agentOutput && body.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)
  const sourceClass = source ? SOURCE_TONE[source] ?? 'bg-[#E7E5E4] text-[#44403C]' : ''

  return (
    <article className="flex flex-col gap-2 border border-[#2D2A20] bg-[#FFFEF5] px-[14px] py-[14px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceEventBadge
            icon={presentation.icon}
            label={presentation.label}
            tone={presentation.tone}
          />
          <span className="text-[13px] font-semibold text-[#2D2A20]">
            {event.actorId}
          </span>
          {source ? (
            <span
              className={joinClasses('rounded px-1.5 py-0.5 font-mono text-[10px]', sourceClass)}
            >
              {source}
            </span>
          ) : null}
          {index ? (
            <span
              className="font-mono text-[10px] text-[#A8A29E]"
              title={`event #${index} · turn ${turn}`}
            >
              #{index}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-0.5 text-[#57534E] hover:text-[#2D2A20]"
              aria-label={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : null}
          <span
            className="text-[11px] text-[#57534E]"
            title={formatTimestamp(event.createdAt)}
          >
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
      </div>

      {agentOutput ? (
        <ShellOutput body={body} />
      ) : (
        <p
          className={joinClasses(
            'whitespace-pre-wrap text-[13px] leading-[1.45]',
            presentation.bodyClassName,
            !expanded ? 'line-clamp-3' : ''
          )}
        >
          {body}
        </p>
      )}

      {hook && expanded ? <HookPayloadDetails payload={event.payload} /> : null}
    </article>
  )
}

function HookPayloadDetails({
  payload,
}: {
  readonly payload: Readonly<Record<string, unknown>>
}) {
  const toolName = typeof payload.tool_name === 'string' ? payload.tool_name : ''
  const cwd = typeof payload.cwd === 'string' ? payload.cwd : ''
  const sessionId =
    typeof payload.session_id === 'string' ? payload.session_id : ''
  const toolInput =
    payload.tool_input && typeof payload.tool_input === 'object'
      ? (payload.tool_input as Record<string, unknown>)
      : null

  const rows: Array<{ label: string; value: string }> = []
  if (toolName) rows.push({ label: 'tool', value: toolName })
  if (toolInput) {
    for (const key of ['file_path', 'path', 'command', 'pattern', 'query', 'url']) {
      const v = toolInput[key]
      if (typeof v === 'string' && v) {
        rows.push({ label: key, value: v })
        break
      }
    }
  }
  if (cwd) rows.push({ label: 'cwd', value: cwd })
  if (sessionId) rows.push({ label: 'session', value: sessionId.slice(0, 16) })

  if (rows.length === 0) return null

  return (
    <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px] text-[#57534E]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-[#A8A29E]">{row.label}</dt>
          <dd className="truncate text-[#2D2A20]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
