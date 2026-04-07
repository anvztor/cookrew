'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { getEventPresentation } from './helpers'
import { joinClasses, WorkspaceEventBadge } from './shared'
import { SessionPill } from './session-pill'
import { ShellOutput } from './shell-output'
import { ThinkingBlock } from './thinking-block'
import { ToolCallCard } from './tool-call-card'
import { ToolResultCard } from './tool-result-card'
import type { Event } from '@/types'

/** Body length beyond which we show the expand/collapse toggle. */
const COLLAPSE_THRESHOLD = 200

function isAgentOutput(event: Event): boolean {
  return event.type === 'milestone' && event.actorType === 'agent'
}

/**
 * Is this event one of the "rich telemetry" types that has its own
 * structured renderer? These events are displayed compactly with no
 * metadata chrome (badge/actor/timestamp) to keep the feed scannable
 * during a long tool-call stream.
 */
function isStructuredTelemetry(event: Event): boolean {
  if (!event.payload) return false
  return (
    event.type === 'session_start' ||
    event.type === 'session_end' ||
    event.type === 'tool_use' ||
    event.type === 'tool_result' ||
    event.type === 'thinking' ||
    event.type === 'agent_reply'
  )
}

export function EventCard({ event }: { readonly event: Event }) {
  // Structured telemetry events render as a compact sub-component
  // with no outer chrome — they're designed to stack densely.
  if (isStructuredTelemetry(event)) {
    return <StructuredEvent event={event} />
  }

  return <LegacyEventCard event={event} />
}

function StructuredEvent({ event }: { readonly event: Event }) {
  const payload = event.payload
  if (!payload) {
    return <LegacyEventCard event={event} />
  }

  const timestamp = (
    <span
      className="text-[10px] text-[#A8A29E]"
      title={new Date(event.createdAt).toLocaleString()}
    >
      {formatRelativeTime(event.createdAt)}
    </span>
  )

  switch (payload.kind) {
    case 'session_start':
      return (
        <div className="flex items-center gap-2 px-[14px] py-1">
          <SessionPill payload={payload} kind="session_start" />
          {timestamp}
        </div>
      )
    case 'session_end':
      return (
        <div className="flex items-center gap-2 px-[14px] py-1">
          <SessionPill payload={payload} kind="session_end" />
          {timestamp}
        </div>
      )
    case 'thinking':
      return (
        <div className="px-[14px] py-0.5">
          <ThinkingBlock text={payload.text} />
        </div>
      )
    case 'tool_use':
      return (
        <div className="px-[14px] py-0.5">
          <ToolCallCard
            toolName={payload.toolName}
            input={payload.input}
            toolUseId={payload.toolUseId}
          />
        </div>
      )
    case 'tool_result':
      return (
        <div className="px-[14px] py-0.5">
          <ToolResultCard
            output={payload.output}
            isError={payload.isError}
            toolUseId={payload.toolUseId}
          />
        </div>
      )
    case 'agent_reply':
      return (
        <div className="px-[14px] py-0.5">
          <div className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-[13px] leading-[1.45] text-[#2D2A20] whitespace-pre-wrap">
            {payload.text}
          </div>
        </div>
      )
    default:
      return <LegacyEventCard event={event} />
  }
}

function LegacyEventCard({ event }: { readonly event: Event }) {
  const presentation = getEventPresentation(event)
  const agentOutput = isAgentOutput(event)
  const isLong = !agentOutput && event.body.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)

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
          <span className="text-[11px] text-[#57534E]">
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
      </div>

      {agentOutput ? (
        <ShellOutput body={event.body} />
      ) : (
        <p
          className={joinClasses(
            'whitespace-pre-wrap text-[13px] leading-[1.45]',
            presentation.bodyClassName,
            !expanded ? 'line-clamp-3' : ''
          )}
        >
          {event.body}
        </p>
      )}
    </article>
  )
}
