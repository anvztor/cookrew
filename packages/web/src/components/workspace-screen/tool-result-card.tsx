'use client'

import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronRight } from 'lucide-react'

const COLLAPSED_MAX_CHARS = 320

export function ToolResultCard({
  output,
  isError,
  toolUseId,
}: {
  readonly output: string
  readonly isError: boolean
  readonly toolUseId: string
}) {
  const needsCollapse = output.length > COLLAPSED_MAX_CHARS
  const [expanded, setExpanded] = useState(!needsCollapse)
  const shown = expanded ? output : output.slice(0, COLLAPSED_MAX_CHARS)
  const borderClass = isError
    ? 'border-[#DC2626]/40'
    : 'border-[#10B981]/30'
  const bgClass = isError ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]'
  const codeBg = isError ? 'bg-[#FEE2E2]' : 'bg-[#DCFCE7]'
  const textColor = isError ? 'text-[#991B1B]' : 'text-[#065F46]'

  return (
    <div
      className={`rounded-md border ${borderClass} ${bgClass}`}
      data-tool-use-id={toolUseId}
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 ${textColor}`}>
        {isError ? (
          <AlertCircle size={12} className="flex-shrink-0" />
        ) : (
          <Check size={12} className="flex-shrink-0" />
        )}
        <span className="text-[11px] font-medium">
          {isError ? 'tool error' : 'tool result'}
        </span>
        {needsCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="ml-auto rounded p-0.5 hover:bg-black/5"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : null}
      </div>
      <pre
        className={`overflow-x-auto border-t border-current/10 ${codeBg} px-3 py-2 font-mono text-[11px] leading-[1.55] ${textColor}`}
      >
        {shown}
        {!expanded && needsCollapse ? '\n…' : ''}
      </pre>
    </div>
  )
}
