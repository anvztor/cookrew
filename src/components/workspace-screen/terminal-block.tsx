'use client'

/**
 * A coalesced terminal view for a run of stream events (stdout/stderr
 * lines from a local CLI agent). Mimics the VS Code / GitHub Actions
 * log UX:
 *
 * - Dense monospace `<pre>` with tight line-height
 * - Collapsed by default when the block exceeds a threshold: show first
 *   12 + last 12 lines with a "… N more lines …" gap expander
 * - Stderr lines rendered in amber; stdout lines neutral
 * - Copy-all button in the header
 * - Sticky auto-scroll when the user is already near the bottom so
 *   live runs track the tail without fighting user-initiated scrolling
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Terminal,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import type { Event } from '@/types'

interface Line {
  readonly id: string
  readonly text: string
  readonly stream: 'stdout' | 'stderr'
}

/** Before this many lines we render everything; above, we truncate. */
const COLLAPSE_THRESHOLD = 30
/** When collapsed, render this many lines from each end. */
const EDGE_LINES = 12
/** Distance in px from bottom that still counts as "at the tail". */
const TAIL_STICKY_THRESHOLD = 40

function extractLines(events: readonly Event[]): Line[] {
  const lines: Line[] = []
  for (const event of events) {
    if (event.payload?.kind !== 'agent_reply') continue
    const stream = event.payload.stream === 'stderr' ? 'stderr' : 'stdout'
    lines.push({
      id: event.id,
      text: event.payload.text,
      stream,
    })
  }
  return lines
}

export function TerminalBlock({
  actorId,
  events,
  stderrLines,
  firstCreatedAt,
  lastCreatedAt,
}: {
  readonly actorId: string
  readonly events: readonly Event[]
  /** Kept on the group type for future render decisions; not used yet. */
  readonly stdoutLines?: number
  readonly stderrLines: number
  readonly firstCreatedAt: string
  readonly lastCreatedAt: string
}) {
  const lines = useMemo(() => extractLines(events), [events])
  const totalLines = lines.length
  const needsCollapse = totalLines > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!needsCollapse)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLPreElement>(null)
  const isFollowing = useRef<boolean>(true)

  // Track whether the user is scrolled to the tail. If so, keep
  // following the stream as new lines arrive; if they scrolled up,
  // leave them where they are.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      isFollowing.current = dist <= TAIL_STICKY_THRESHOLD
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // When new lines stream in, snap to the bottom only if the user was
  // already following the tail.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (isFollowing.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [totalLines, expanded])

  const displayLines = useMemo(() => {
    if (expanded || !needsCollapse) return lines
    const head = lines.slice(0, EDGE_LINES)
    const tail = lines.slice(-EDGE_LINES)
    return [...head, ...tail]
  }, [lines, expanded, needsCollapse])

  const hiddenCount = needsCollapse && !expanded
    ? Math.max(0, totalLines - EDGE_LINES * 2)
    : 0

  const handleCopy = () => {
    const full = lines.map((l) => l.text).join('\n')
    void navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#374151]">
      <header className="flex items-center gap-3 bg-[#1F2937] px-3 py-1.5">
        <Terminal size={12} className="flex-shrink-0 text-[#9CA3AF]" />
        <span className="text-[11px] font-medium text-[#9CA3AF]">
          {actorId}
        </span>
        <span className="text-[11px] text-[#6B7280]">·</span>
        <span className="text-[11px] text-[#9CA3AF]">
          {totalLines.toLocaleString()} line{totalLines === 1 ? '' : 's'}
          {stderrLines > 0
            ? ` (${stderrLines.toLocaleString()} stderr)`
            : ''}
        </span>
        <span className="text-[11px] text-[#6B7280]">·</span>
        <span
          className="text-[11px] text-[#6B7280]"
          title={new Date(lastCreatedAt).toLocaleString()}
        >
          {formatRelativeTime(firstCreatedAt)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {needsCollapse ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded p-1 text-[#9CA3AF] hover:bg-[#374151] hover:text-[#D1D5DB]"
              aria-label={expanded ? 'Collapse' : 'Expand all'}
              title={expanded ? 'Collapse' : 'Expand all lines'}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#374151] hover:text-[#D1D5DB]"
            aria-label="Copy output"
            title="Copy all lines"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </header>

      <pre
        ref={scrollRef}
        className="overflow-auto bg-[#0F172A] px-3 py-2 font-mono text-[11.5px] leading-[1.45] text-[#E5E7EB]"
        style={{ maxHeight: expanded ? '560px' : '320px' }}
      >
        {displayLines.map((line, i) => {
          // Insert the "hidden lines" separator between the head and
          // the tail when collapsed.
          const isGapPoint =
            hiddenCount > 0 && i === EDGE_LINES
          return (
            <span key={line.id}>
              {isGapPoint ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="my-1 block w-full rounded border border-dashed border-[#374151] px-2 py-1 text-center text-[10.5px] text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#E5E7EB]"
                >
                  … {hiddenCount.toLocaleString()} more line
                  {hiddenCount === 1 ? '' : 's'} — click to show all
                </button>
              ) : null}
              <span
                className={
                  line.stream === 'stderr' ? 'text-[#FCD34D]' : undefined
                }
              >
                {line.text || ' '}
              </span>
              {'\n'}
            </span>
          )
        })}
      </pre>
    </div>
  )
}
