'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { getEventPresentation } from './helpers'
import { joinClasses, WorkspaceEventBadge } from './shared'
import { ShellOutput } from './shell-output'
import type { Event } from '@/types'

/** Body length beyond which we show the expand/collapse toggle. */
const COLLAPSE_THRESHOLD = 200

function isAgentOutput(event: Event): boolean {
  return event.type === 'milestone' && event.actorType === 'agent'
}

export function EventCard({ event }: { readonly event: Event }) {
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
