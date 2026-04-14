'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'

function summarizeInput(input: unknown): string {
  if (typeof input === 'string') return input.slice(0, 120)
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>
    for (const key of ['command', 'file_path', 'path', 'query', 'description']) {
      const val = obj[key]
      if (typeof val === 'string' && val) return val.slice(0, 120)
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v) return v.slice(0, 120)
    }
  }
  return ''
}

export function ToolCallCard({
  toolName,
  input,
  toolUseId,
}: {
  readonly toolName: string
  readonly input: unknown
  readonly toolUseId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = summarizeInput(input)
  const hasStructuredInput = input !== null && typeof input === 'object'

  return (
    <div
      className="rounded-md border border-[#F59E0B]/40 bg-[#FFFBEB]"
      data-tool-use-id={toolUseId}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {hasStructuredInput ? (
          expanded ? (
            <ChevronDown size={13} className="flex-shrink-0 text-[#B45309]" />
          ) : (
            <ChevronRight size={13} className="flex-shrink-0 text-[#B45309]" />
          )
        ) : (
          <span className="w-[13px]" />
        )}
        <Wrench size={13} className="flex-shrink-0 text-[#B45309]" />
        <span className="font-mono text-[12px] font-semibold text-[#92400E]">
          {toolName || 'tool'}
        </span>
        {preview ? (
          <span className="flex-1 truncate font-mono text-[12px] text-[#78350F]/80">
            ({preview})
          </span>
        ) : null}
      </button>
      {expanded && hasStructuredInput ? (
        <pre className="overflow-x-auto border-t border-[#FCD34D] bg-[#FEF3C7] px-3 py-2 font-mono text-[11px] leading-[1.55] text-[#78350F]">
          {JSON.stringify(input, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
