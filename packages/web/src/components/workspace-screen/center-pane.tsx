'use client'

import { AtSign, ArrowDown, Brain, MessageSquare, PlayCircle, Send, Terminal, Zap } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { EventGroupCard } from './event-group-card'
import {
  bucketOf,
  groupEvents,
  summarize,
  type FeedBucket,
} from './group-events'
import {
  buttonClassName,
  EmptyWorkspaceState,
  joinClasses,
  WorkspaceBadge,
} from './shared'
import { TaskLiveFeed } from './task-live-feed'
import { TerminalBlock } from './terminal-block'
import type { WorkspaceCenterPaneProps } from './types'

const ALL_BUCKETS: readonly FeedBucket[] = [
  'tools',
  'thinking',
  'messages',
  'sessions',
  'other',
] as const

const BUCKET_LABELS: Record<FeedBucket, string> = {
  tools: 'tools',
  thinking: 'thinking',
  messages: 'messages',
  sessions: 'sessions',
  other: 'other',
}

const BUCKET_ICONS: Record<FeedBucket, React.ElementType> = {
  tools: Terminal,
  thinking: Brain,
  messages: MessageSquare,
  sessions: PlayCircle,
  other: Zap,
}

/** Distance (px) from the bottom at which we consider the user "pinned". */
const BOTTOM_STICKY_THRESHOLD = 120

/**
 * Event types already rendered as steps inside TaskLiveCard. We filter
 * them out of the feed so the same telemetry isn't shown twice.
 * Keep in sync with task-live-card.tsx::buildSteps.
 */
const LIVE_CARD_EVENT_TYPES: ReadonlySet<string> = new Set([
  'tool_use',
  'tool_result',
  'thinking',
  'agent_reply',
  'milestone',
])

export function WorkspaceCenterPane({
  events,
  hasQuery,
  isSubmitting,
  mobile = false,
  onCreateBundle,
  onToggleTaskSeeds,
  prompt,
  recipeId,
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
  const [enabledBuckets, setEnabledBuckets] = useState<Set<FeedBucket>>(
    () => new Set<FeedBucket>(ALL_BUCKETS)
  )

  // The TaskLiveCard already renders these types as per-task "steps"
  // (tool_use/tool_result pairs, reasoning, agent replies, milestones).
  // Dropping them here keeps the feed focused on the bundle narrative —
  // prompts, plans, session boundaries, digests, fact_added, code_pushed —
  // and avoids rendering the same telemetry twice.
  // Keep in sync with task-live-card.tsx::buildSteps.
  const feedEvents = useMemo(
    () => events.filter((e) => !LIVE_CARD_EVENT_TYPES.has(e.type)),
    [events]
  )

  // Collapse raw events into richer groups (pair PreToolUse+PostToolUse,
  // bundle consecutive reasoning, dedupe repeated session boundaries).
  const grouped = useMemo(() => groupEvents(feedEvents), [feedEvents])
  const summary = useMemo(() => summarize(grouped), [grouped])
  const visibleGroups = useMemo(
    () => grouped.filter((g) => enabledBuckets.has(bucketOf(g))),
    [grouped, enabledBuckets]
  )

  const toggleBucket = (bucket: FeedBucket) => {
    setEnabledBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      // Never allow all chips to be off — snap back to a useful default.
      if (next.size === 0) {
        for (const b of ALL_BUCKETS) next.add(b)
      }
      return next
    })
  }

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
      <div className="flex flex-col gap-2 border-b border-[#2D2A20] bg-[#FAF8F4] px-5 py-3">
        <div className="flex items-center gap-3">
          <p className="text-[15px] font-bold text-[#2D2A20]">Event Feed</p>
          <WorkspaceBadge
            label={`${feedEvents.length} raw · ${grouped.length} grouped`}
            tone="default"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ALL_BUCKETS.map((bucket) => {
            const count = summary[bucket]
            if (count === 0) return null
            const enabled = enabledBuckets.has(bucket)
            const Icon = BUCKET_ICONS[bucket]
            return (
              <button
                key={bucket}
                type="button"
                onClick={() => toggleBucket(bucket)}
                aria-pressed={enabled}
                className={joinClasses(
                  'inline-flex items-center gap-1.5 rounded-full border px-[10px] py-1 text-[11px] font-medium transition-colors',
                  enabled
                    ? 'border-[#2D2A20] bg-[#FFFBEB] text-[#2D2A20]'
                    : 'border-[#D6D3D1] bg-transparent text-[#A8A29E]'
                )}
              >
                <Icon size={12} />
                <span>{BUCKET_LABELS[bucket]}</span>
                <span className="font-mono text-[10px]">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-5 py-4"
        >
          {selectedBundle ? (
            <div className="flex flex-col gap-3">
              {recipeId && (
                <TaskLiveFeed
                  recipeId={recipeId}
                  bundleId={selectedBundle.bundle.id}
                />
              )}
              {visibleGroups.length > 0 ? (
                visibleGroups.map((group) => (
                  <EventGroupCard key={group.key} group={group} />
                ))
              ) : (
                <EmptyWorkspaceState>
                  {hasQuery
                    ? 'No feed events match that search yet.'
                    : feedEvents.length > 0
                    ? 'All matching events are hidden — re-enable a filter chip above.'
                    : events.length > 0
                    ? 'All activity for this bundle is shown in the task live card above.'
                    : 'The active bundle does not have any events yet.'}
                </EmptyWorkspaceState>
              )}
            </div>
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
              <span>{selectedAgent?.display_name ?? 'all-agents'}</span>
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
                <div className="border border-[#E7E5E4] bg-[#FAF8F4] px-3 py-2 text-[13px] text-[#57534E]">
                  @{requestedBy}
                </div>
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
