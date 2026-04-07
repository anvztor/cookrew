'use client'

import { AtSign, ArrowDown, Filter, Send } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EventCard } from './event-card'
import {
  buttonClassName,
  EmptyWorkspaceState,
  joinClasses,
  WorkspaceBadge,
} from './shared'
import type { WorkspaceCenterPaneProps } from './types'

/** Distance (px) from the bottom at which we consider the user "pinned". */
const BOTTOM_STICKY_THRESHOLD = 120

export function WorkspaceCenterPane({
  events,
  hasQuery,
  isSubmitting,
  mobile = false,
  onCreateBundle,
  onToggleTaskSeeds,
  prompt,
  requestedBy,
  selectedAgent,
  selectedBundle,
  setPrompt,
  setRequestedBy,
  setTaskSeedText,
  showTaskSeeds,
  taskSeedText,
  testId,
}: WorkspaceCenterPaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickyBottomRef = useRef(true)
  const prevCountRef = useRef(events.length)
  const [newCount, setNewCount] = useState(0)

  // Track whether the user is pinned near the bottom of the feed.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      const pinned = distance <= BOTTOM_STICKY_THRESHOLD
      stickyBottomRef.current = pinned
      if (pinned && newCount !== 0) setNewCount(0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [newCount])

  // After events update: if we were pinned, auto-scroll. Otherwise
  // accumulate a "N new" counter the user can click to jump down.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prev = prevCountRef.current
    prevCountRef.current = events.length
    if (events.length > prev) {
      if (stickyBottomRef.current) {
        el.scrollTop = el.scrollHeight
      } else {
        setNewCount((n) => n + (events.length - prev))
      }
    } else if (events.length < prev) {
      // Bundle switch: reset counter and pin to bottom.
      setNewCount(0)
      stickyBottomRef.current = true
      el.scrollTop = el.scrollHeight
    }
  }, [events.length])

  // When the selected bundle changes entirely, scroll to the newest
  // event so the user sees the most recent activity.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    stickyBottomRef.current = true
    setNewCount(0)
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [selectedBundle?.bundle.id])

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    stickyBottomRef.current = true
    setNewCount(0)
  }

  return (
    <section
      data-testid={testId}
      className={joinClasses(
        'flex h-full min-w-0 flex-col bg-[#FAF8F4]',
        mobile ? 'border-b border-[#2D2A20]' : ''
      )}
    >
      <div className="flex items-center gap-3 border-b border-[#2D2A20] bg-[#FAF8F4] px-5 py-3">
        <p className="text-[15px] font-bold text-[#2D2A20]">Event Feed</p>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2D2A20] bg-[#FFFBEB] px-[10px] py-1">
          <Filter size={12} className="text-[#57534E]" />
          <span className="text-[11px] font-medium text-[#57534E]">All types</span>
        </div>
        <WorkspaceBadge label={`${events.length} events`} tone="default" />
      </div>

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-5 py-4"
        >
          {selectedBundle ? (
            events.length > 0 ? (
              <div className="flex flex-col gap-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EmptyWorkspaceState>
                {hasQuery
                  ? 'No feed events match that search yet.'
                  : 'The active bundle does not have any events yet.'}
              </EmptyWorkspaceState>
            )
          ) : (
            <EmptyWorkspaceState>
              Create a bundle to populate the workspace feed and right sidebar.
            </EmptyWorkspaceState>
          )}
        </div>

        {newCount > 0 ? (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#2D2A20] bg-[#2D2A20] px-4 py-1.5 text-[12px] font-semibold text-[#FAF8F4] shadow-lg transition-transform hover:-translate-y-0.5"
            aria-label={`Jump to ${newCount} new event${newCount === 1 ? '' : 's'}`}
          >
            <ArrowDown size={14} />
            {newCount} new event{newCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      <div className="border-t border-[#2D2A20] bg-[#FFFEF5] px-5 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#57534E]">
              Prompt Composer
            </span>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9333EA]">
              <AtSign size={12} />
              <span>{selectedAgent?.displayName ?? 'all-agents'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border border-[#2D2A20] bg-[#FAF8F4] px-[14px] py-3">
            <textarea
              aria-label="Prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Refine Day 3 dinner — swap pasta for a lower-carb option..."
              rows={1}
              className="max-h-24 min-h-[20px] flex-1 resize-none bg-transparent text-[13px] leading-[1.45] text-[#2D2A20] outline-none placeholder:text-[#A8A29E]"
            />

            <button
              type="button"
              aria-label={isSubmitting ? 'Opening bundle' : 'Open Bundle'}
              onClick={onCreateBundle}
              disabled={isSubmitting}
              className={buttonClassName('primary', 'sm')}
            >
              <Send size={16} className="text-[#9B8ACB]" />
              {isSubmitting ? 'Sending' : 'Send'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#A8A29E]">
            <span>⌘K command palette</span>
            <span>·</span>
            <span>Tab to autocomplete</span>
            <span>·</span>
            <span>@mention agent</span>
            <button
              type="button"
              onClick={onToggleTaskSeeds}
              className="ml-auto text-[11px] font-medium text-[#57534E] underline decoration-dotted underline-offset-4"
            >
              {showTaskSeeds ? 'Hide task seeds' : 'Add task seeds'}
            </button>
          </div>

          {showTaskSeeds ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#57534E]">
                  Requested By
                </span>
                <input
                  value={requestedBy}
                  onChange={(event) => setRequestedBy(event.target.value)}
                  className="border border-[#2D2A20] bg-[#FAF8F4] px-3 py-2 text-[13px] text-[#2D2A20] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#57534E]">
                  Optional Task Seeds
                </span>
                <textarea
                  aria-label="Optional Task Seeds"
                  value={taskSeedText}
                  onChange={(event) => setTaskSeedText(event.target.value)}
                  placeholder={`Scope the bundle\nImplement the API client\nReview the digest path`}
                  rows={3}
                  className="resize-y border border-[#2D2A20] bg-[#FAF8F4] px-3 py-2 text-[13px] leading-[1.45] text-[#2D2A20] outline-none placeholder:text-[#A8A29E]"
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
