'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'

export function ThinkingBlock({ text }: { readonly text: string }) {
  const [expanded, setExpanded] = useState(false)
  const preview = text.trim().split('\n')[0]?.slice(0, 120) ?? ''

  return (
    <div className="rounded-md border border-dashed border-[#C4B5FD] bg-[#F5F3FF] px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 text-left text-[12px] italic text-[#6D28D9]"
      >
        {expanded ? (
          <ChevronDown size={12} className="flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="flex-shrink-0" />
        )}
        <Brain size={12} className="flex-shrink-0" />
        <span className="flex-1 truncate">
          thinking{preview ? ` — ${preview}` : '…'}
        </span>
      </button>
      {expanded ? (
        <pre className="mt-2 whitespace-pre-wrap border-t border-[#DDD6FE] pt-2 font-mono text-[12px] italic leading-[1.55] text-[#5B21B6]">
          {text}
        </pre>
      ) : null}
    </div>
  )
}
