'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Terminal } from 'lucide-react'

/** Max collapsed height in pixels. */
const COLLAPSED_HEIGHT = 160

export function ShellOutput({ body }: { readonly body: string }) {
  const scrollRef = useRef<HTMLPreElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setOverflows(el.scrollHeight > COLLAPSED_HEIGHT)
  }, [body])

  useEffect(() => {
    if (!expanded) return
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [expanded, body])

  function handleCopy() {
    void navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#374151]">
      <div className="flex items-center justify-between bg-[#1F2937] px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-[#9CA3AF]" />
          <span className="text-[11px] font-medium text-[#9CA3AF]">
            agent output
          </span>
        </div>

        <div className="flex items-center gap-1">
          {overflows ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded p-1 text-[#9CA3AF] hover:bg-[#374151] hover:text-[#D1D5DB]"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#374151] hover:text-[#D1D5DB]"
            aria-label="Copy output"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      <pre
        ref={scrollRef}
        className="overflow-x-auto bg-[#111827] px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-[#E5E7EB] transition-[max-height] duration-200"
        style={{
          maxHeight: expanded ? 'none' : `${COLLAPSED_HEIGHT}px`,
          overflowY: expanded ? 'auto' : 'hidden',
        }}
      >
        {body}
      </pre>

      {overflows && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1 bg-[#1F2937] py-1 text-[11px] text-[#9CA3AF] hover:text-[#D1D5DB]"
        >
          <ChevronDown size={12} />
          Show all
        </button>
      ) : null}
    </div>
  )
}
