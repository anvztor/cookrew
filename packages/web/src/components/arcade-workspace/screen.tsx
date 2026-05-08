/**
 * ArcadeWorkspace — main screen for /recipes/[recipeId].
 *
 * v3 Responsive shell. Mobile-first layout with slide-in drawers for
 * the party (left) and event feed (right); on desktops (≥980px) the
 * drawers dock as side panes. Real cookrew data flows through the
 * existing hooks unchanged.
 *
 * Layout:
 *   ┌────────── CrHeader ──────────┐
 *   │ logo · bundle  · party feed  │
 *   ├──────────────────────────────┤
 *   │ ┌Party┐  Stage     ┌  Feed ┐ │
 *   │ │     │  (mission) │       │ │
 *   │ └─────┘            └───────┘ │
 *   ├──────────────────────────────┤
 *   │       ComposerDock           │
 *   └──────────────────────────────┘
 *
 * On mobile the side panes collapse into modal drawers controlled by
 * the header's party / feed buttons.
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Bundle, WorkspaceData } from '@cookrew/shared'
import { cancelTask, createBundle, getWorkspaceData, rerunBundle } from '@/lib/api'
import { useAuthContext } from '@/components/auth-provider'
import { useWatch } from '@/hooks/use-watch'
import { useTaskStream } from '@/hooks/use-task-stream'

import { AgentDetailOverlay } from './agent-detail-overlay'
import { ArcadeSidebar } from './arcade-sidebar'
import { ComposerDock } from './composer-dock'
import { CrHeader } from './cr-header'
import { CrButton, CrChip } from './cr-chrome'
import { DEMO_WORKSPACE_DATA } from './demo-fixture'
import { EventFeed } from './event-feed'
import { HITLBarStrip, PromptCard, buildHitlPrompts } from './hitl-bars'
import { MissionBoard } from './mission-board'
import { SandboxWindow } from './sandbox-window'
import type { PartyMember } from './mapping'
import { TaskLiveCard } from './task-live-card'
import {
  BundleReviewPopout,
  CookbookPopout,
  RecipeHistoryPopout,
} from '@/components/arcade-pages'
import {
  agentsToPartyMembers,
  buildMissionHeader,
  eventsToPipBoyLines,
  humansToPartyMembers,
  tasksToQuests,
} from './mapping'

function BlockedBanner({
  count,
  reason,
  onRerun,
  rerunning,
}: {
  count: number
  reason: string | null
  onRerun: () => void
  rerunning: boolean
}) {
  if (count === 0 && !reason) return null
  return (
    <div
      className="cr"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        borderBottom: '2px solid var(--line)',
        background:
          'repeating-linear-gradient(135deg, #FEF3C7, #FEF3C7 8px, #FDE68A 8px, #FDE68A 16px)',
        fontSize: 12,
        color: 'var(--ink)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid var(--line)',
          background: 'var(--amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
          fontSize: 12,
        }}
      >
        !
      </div>
      <div className="cr-display" style={{ fontSize: 10 }}>
        {count > 0 ? `${count} QUEST${count > 1 ? 'S' : ''} BLOCKED` : 'BUNDLE BLOCKED'} ·{' '}
        <span
          style={{
            fontFamily:
              "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          {reason ?? 'awaiting operator action'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <CrButton size="tiny" onClick={onRerun} disabled={rerunning}>
        ↻ {rerunning ? 'RERUNNING…' : 'RERUN'}
      </CrButton>
    </div>
  )
}

export interface ArcadeWorkspaceProps {
  recipeId: string
}

export function ArcadeWorkspace({ recipeId }: ArcadeWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bundleIdFromUrl = searchParams.get('bundle')
  const popoutKind = searchParams.get('popout') // 'cookbook' | 'history' | 'review' | null
  const demoMode = searchParams.get('demo') === '1'
  const { username, accountId } = useAuthContext()
  const requestedBy = username || accountId || 'anonymous'

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [creatingBundle, setCreatingBundle] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [hAgent, setHAgent] = useState<string | null>(null)
  const [hTask, setHTask] = useState<string | null>(null)
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null)
  const [partyOpen, setPartyOpen] = useState(false)
  const [feedOpen, setFeedOpen] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const [promptStates, setPromptStates] = useState<
    Record<string, 'bar' | 'full' | 'dismissed'>
  >({})
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<PartyMember | null>(null)

  // Mirror the CSS @media (min-width: 980px) breakpoint into JS so the
  // header drawer toggles know whether they should still flip state on
  // desktop (where panes are docked) or only on mobile.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 980px)')
    const sync = () => setIsWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // On wide viewports the side panes are visible by default; on mobile
  // both drawers stay closed until toggled. Reinitialise on breakpoint
  // changes — must run before any conditional return below.
  useEffect(() => {
    if (isWide) {
      setPartyOpen(true)
      setFeedOpen(true)
    } else {
      setPartyOpen(false)
      setFeedOpen(false)
    }
  }, [isWide])

  const load = useCallback(
    async (nextBundleId?: string | null, withLoading = false) => {
      if (demoMode) {
        // Skip the network call — render the v3 shell against fixture data
        // so the layout / drawers / mode dial can be reviewed without a
        // live krewhub backend running.
        setData(DEMO_WORKSPACE_DATA)
        if (withLoading) setIsLoading(false)
        return
      }
      if (withLoading) setIsLoading(true)
      setError(null)
      try {
        const nextData = await getWorkspaceData(recipeId, nextBundleId)
        setData(nextData)
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load workspace.',
        )
      } finally {
        if (withLoading) setIsLoading(false)
      }
    },
    [recipeId, demoMode],
  )

  useEffect(() => {
    void load(bundleIdFromUrl, true)
  }, [bundleIdFromUrl, load])

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (reloadTimerRef.current !== null) clearTimeout(reloadTimerRef.current)
    }
  }, [])
  useWatch(recipeId, () => {
    if (reloadTimerRef.current !== null) return
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null
      void load(data?.selected_bundle_id ?? bundleIdFromUrl, false)
    }, 300)
  })

  const selectedBundle = data?.selected_bundle ?? null
  const bundle = selectedBundle?.bundle ?? null
  const allTasks = useMemo(
    () => selectedBundle?.tasks ?? [],
    [selectedBundle],
  )
  const allEvents = useMemo(
    () => selectedBundle?.events ?? [],
    [selectedBundle],
  )

  const liveStatesReadonly = useTaskStream(recipeId, {
    bundleId: bundle?.id,
    terminalLingerMs: 0,
  })
  const liveStates = liveStatesReadonly as Readonly<
    Record<string, import('@/hooks/use-task-stream').TaskLiveState>
  >

  const humans = useMemo(
    () => humansToPartyMembers(data?.members ?? []),
    [data?.members],
  )
  const agents = useMemo(
    () => agentsToPartyMembers(data?.agents ?? []),
    [data?.agents],
  )
  const quests = useMemo(
    () => tasksToQuests(allTasks, liveStates, data?.agents ?? []),
    [allTasks, liveStates, data?.agents],
  )
  const pipBoyLines = useMemo(() => eventsToPipBoyLines(allEvents), [allEvents])
  const missionHeader = useMemo(
    () => buildMissionHeader(bundle, allTasks, liveStates),
    [bundle, allTasks, liveStates],
  )

  const [hitlTick, setHitlTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setHitlTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const hitlPrompts = useMemo(
    () =>
      buildHitlPrompts(
        quests,
        (taskId) => {
          const live = liveStates[taskId]
          return live ? { agentId: live.agentId ?? '—', sessionId: null } : null
        },
        (taskId) => liveStates[taskId]?.startedAt ?? null,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quests, liveStates, hitlTick],
  )
  const hitlBars = hitlPrompts.filter(
    (p) => promptStates[p.id] !== 'full' && promptStates[p.id] !== 'dismissed',
  )
  const hitlFullPrompts = hitlPrompts.filter((p) => promptStates[p.id] === 'full')

  const linkedTaskForAgent = useCallback(
    (aid: string) =>
      quests.find((q) => q.assignee === aid.split('@')[0].toUpperCase())?.id ?? null,
    [quests],
  )
  const linkedAgentForTask = useCallback(
    (tid: string) => {
      const q = quests.find((x) => x.id === tid)
      if (!q || q.assignee === '—') return null
      const match = agents.find((a) => a.name === q.assignee)
      return match?.id ?? null
    },
    [quests, agents],
  )
  const effHAgent = hAgent ?? (hTask ? linkedAgentForTask(hTask) : null)
  const effHTask = hTask ?? (hAgent ? linkedTaskForAgent(hAgent) : null)

  const online = agents.filter((a) => a.status !== 'off').length
  const total = agents.length
  const blockedCount = quests.filter((q) => q.status === 'blocked').length
  const cookbookHref = `/recipes/${recipeId}?popout=cookbook${
    bundleIdFromUrl ? `&bundle=${bundleIdFromUrl}` : ''
  }`
  const historyHref = `/recipes/${recipeId}?popout=history${
    bundleIdFromUrl ? `&bundle=${bundleIdFromUrl}` : ''
  }`
  const reviewHref = bundle
    ? `/recipes/${recipeId}?popout=review&bundle=${bundle.id}`
    : null

  const doneCount = useMemo(
    () => quests.filter((q) => q.status === 'done').length,
    [quests],
  )
  const totalCount = quests.length
  const eventCount = allEvents.length

  const handleNewBundle = useCallback(async () => {
    if (creatingBundle) return
    setCreatingBundle(true)
    setError(null)
    try {
      const { bundle_id } = await createBundle(recipeId, {
        prompt: '',
        requested_by: requestedBy,
        task_titles: [],
      })
      router.push(`/recipes/${recipeId}?bundle=${bundle_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create bundle')
    } finally {
      setCreatingBundle(false)
    }
  }, [creatingBundle, recipeId, requestedBy, router])

  const handleTaskCreated = useCallback(() => {
    void load(bundle?.id ?? bundleIdFromUrl, false)
  }, [bundle?.id, bundleIdFromUrl, load])

  const handleRerun = useCallback(async () => {
    if (!bundle || rerunning) return
    setRerunning(true)
    try {
      const { bundle_id } = await rerunBundle(recipeId, bundle.id)
      router.push(`/recipes/${recipeId}?bundle=${bundle_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rerun failed')
    } finally {
      setRerunning(false)
    }
  }, [bundle, rerunning, recipeId, router])

  const bundleLabel = bundle
    ? `${bundle.id.slice(0, 12).toUpperCase()} · ${bundle.status.toUpperCase()}`
    : 'NO BUNDLE'

  const bundleSelector = useMemo(() => {
    if (!data?.bundles?.length) return null
    const recent = data.bundles.slice(0, 8)
    return (
      <select
        value={bundle?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value
          if (id) router.push(`/recipes/${recipeId}?bundle=${id}`)
        }}
        className="cr-mono"
        style={{
          padding: '4px 8px',
          fontSize: 11,
          background: 'var(--cream-md)',
          color: 'var(--ink)',
          border: '1.5px solid var(--line)',
          minWidth: 180,
        }}
      >
        <option value="">— pick bundle —</option>
        {recent.map((b: Bundle) => (
          <option key={b.id} value={b.id}>
            {b.id.slice(0, 10)} · {b.status} · {b.prompt.slice(0, 40)}
          </option>
        ))}
      </select>
    )
  }, [data?.bundles, bundle?.id, recipeId, router])

  if (error && !data) {
    return (
      <div
        className="cr"
        style={{
          padding: 40,
          minHeight: '100vh',
          color: 'var(--ink)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        <div className="cr-display" style={{ fontSize: 16, marginBottom: 12 }}>
          LOAD FAILED
        </div>
        <div>{error}</div>
      </div>
    )
  }

  const closeDrawers = () => {
    setPartyOpen(false)
    setFeedOpen(false)
  }

  const togglePartyDrawer = () => {
    if (isWide) {
      setPartyOpen((o) => !o)
      return
    }
    setFeedOpen(false)
    setPartyOpen((o) => !o)
  }

  const toggleFeedDrawer = () => {
    if (isWide) {
      setFeedOpen((o) => !o)
      return
    }
    setPartyOpen(false)
    setFeedOpen((o) => !o)
  }

  return (
    <div
      className={`cr cr-app${partyOpen ? ' party-open' : ''}${
        feedOpen ? ' feed-open' : ''
      }`}
      data-screen-label="Arcade · Workspace"
    >
      <CrHeader
        variant={isWide ? 'desktop' : 'mobile'}
        bundleLabel={bundleLabel}
        recipeName={data?.recipe?.name ?? null}
        online={online}
        total={total}
        partyOpen={partyOpen}
        feedOpen={feedOpen}
        onParty={togglePartyDrawer}
        onFeed={toggleFeedDrawer}
        onAvatar={() => router.push('/auth')}
        username={username}
        extra={bundleSelector}
      />

      {bundle?.status === 'blocked' && (
        <BlockedBanner
          count={blockedCount}
          reason={bundle?.blocked_reason ?? null}
          onRerun={() => void handleRerun()}
          rerunning={rerunning}
        />
      )}

      <div className="cr-stage">
        <div className="cr-app-row" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* PARTY drawer (or docked pane on desktop). On desktop we
              fully unmount the pane when closed so it doesn't take layout
              space; on mobile the drawer slides off-screen so we leave it
              mounted and disable pointer events while hidden. */}
          {(isWide ? partyOpen : true) && (
          <div
            className="cr-drawer left"
            style={!isWide && !partyOpen ? { pointerEvents: 'none' } : undefined}
          >
            <ArcadeSidebar
              humans={humans}
              agents={agents}
              collapsed={false}
              onToggleCollapse={() => setPartyOpen((o) => !o)}
              onHoverAgent={setHAgent}
              highlightedAgent={effHAgent}
              activeAgent={selectedMember?.id ?? null}
              onSelectAgent={(m) =>
                setSelectedMember((prev) => (prev?.id === m.id ? null : m))
              }
            />
          </div>
          )}

          {/* Main stage — mission board */}
          <div
            className="pc-stage-bg"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--cream)',
            }}
          >
            {/* Bundle title strip */}
            <div
              className="cr"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderBottom: '2px solid var(--line)',
                background: 'var(--cream-hi)',
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="cr-display" style={{ fontSize: 12 }}>
                    {bundle ? bundle.id.slice(0, 12).toUpperCase() : 'NO BUNDLE'}
                  </span>
                  {bundle && <CrChip tone="amber" style={{ fontSize: 7 }}>LIVE</CrChip>}
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={missionHeader.title}
                >
                  {missionHeader.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    className="cr-mono"
                    style={{ fontSize: 9, color: 'var(--muted)' }}
                  >
                    {missionHeader.totalCount} QUESTS
                  </span>
                  {missionHeader.clearedCount > 0 && (
                    <CrChip tone="emerald" style={{ fontSize: 7 }}>
                      {missionHeader.clearedCount} CLEARED
                    </CrChip>
                  )}
                  {missionHeader.workingCount > 0 && (
                    <CrChip tone="amber" style={{ fontSize: 7 }}>
                      {missionHeader.workingCount} WORKING
                    </CrChip>
                  )}
                  {missionHeader.blockedCount > 0 && (
                    <CrChip tone="rose" style={{ fontSize: 7 }}>
                      {missionHeader.blockedCount} BLOCKED
                    </CrChip>
                  )}
                </div>
              </div>
              <CrButton
                size="tiny"
                variant="primary"
                onClick={() => void handleNewBundle()}
                disabled={creatingBundle}
                title="create blank bundle"
              >
                ＋ {creatingBundle ? 'NEW…' : 'NEW'}
              </CrButton>
              <CrButton
                size="tiny"
                onClick={() => setSandboxOpen(true)}
                title="open sandbox"
              >
                ⇱ SANDBOX
              </CrButton>
              <CrButton
                size="tiny"
                onClick={() => router.push(cookbookHref)}
                title="open cookbook popout"
              >
                COOKBOOK
              </CrButton>
              <CrButton
                size="tiny"
                onClick={() => router.push(historyHref)}
                title="open recipe history"
              >
                HISTORY
              </CrButton>
              {reviewHref && (
                <CrButton
                  size="tiny"
                  variant="primary"
                  onClick={() => router.push(reviewHref)}
                >
                  ▣ REPORT-IN
                </CrButton>
              )}
            </div>

            {/* Board canvas */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {isLoading && !data ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontFamily:
                      "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  }}
                >
                  <div
                    className="cr-display"
                    style={{ fontSize: 11, color: 'var(--ink-soft)' }}
                  >
                    LOADING WORKSPACE…
                  </div>
                </div>
              ) : (
                <MissionBoard
                  quests={quests}
                  highlightedTask={effHTask}
                  selectedTask={selectedQuestId}
                  onHoverTask={setHTask}
                  onSelectTask={(q) =>
                    setSelectedQuestId((prev) => (prev === q.id ? null : q.id))
                  }
                />
              )}

              <HITLBarStrip
                items={hitlBars}
                onRestore={(id) =>
                  setPromptStates((s) => ({ ...s, [id]: 'full' }))
                }
              />

              {hitlFullPrompts.map((p, i) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  initialX={220 + (i % 4) * 32}
                  initialY={60 + (i % 4) * 28}
                  z={25 + i}
                  onMinimize={() =>
                    setPromptStates((s) => ({ ...s, [p.id]: 'bar' }))
                  }
                  options={[
                    {
                      label: 'CANCEL TASK',
                      hint: 'stops this quest · agent frees up',
                      onPick: async () => {
                        try {
                          await cancelTask(p.id)
                        } catch {
                          // Silently swallow — task may already be cancelled.
                        }
                        setPromptStates((s) => ({ ...s, [p.id]: 'dismissed' }))
                      },
                    },
                    {
                      label: 'KEEP CONTEXT · DISMISS',
                      hint: 'hides bar · task stays blocked',
                      onPick: () => {
                        setPromptStates((s) => ({ ...s, [p.id]: 'dismissed' }))
                      },
                    },
                  ]}
                />
              ))}

              {sandboxOpen && (
                <SandboxWindow
                  recipe={data?.recipe ?? null}
                  members={data?.members ?? []}
                  agents={data?.agents ?? []}
                  onClose={() => setSandboxOpen(false)}
                />
              )}

              {selectedMember && (
                <AgentDetailOverlay
                  member={selectedMember}
                  currentQuest={
                    selectedMember.taskId
                      ? quests.find((q) => q.id === selectedMember.taskId) ?? null
                      : null
                  }
                  onClose={() => setSelectedMember(null)}
                />
              )}

              {selectedQuestId &&
                (() => {
                  const q = quests.find((x) => x.id === selectedQuestId)
                  if (!q) return null
                  return (
                    <TaskLiveCard
                      quest={q}
                      liveState={liveStates[selectedQuestId] ?? null}
                      onClose={() => setSelectedQuestId(null)}
                    />
                  )
                })()}
            </div>
          </div>

          {/* FEED drawer (or docked pane on desktop) */}
          {(isWide ? feedOpen : true) && (
          <div
            className="cr-drawer right"
            style={!isWide && !feedOpen ? { pointerEvents: 'none' } : undefined}
          >
            <EventFeed
              fill
              lines={pipBoyLines}
              bundleLabel={
                bundle ? bundle.id.slice(0, 12).toUpperCase() : 'NO BUNDLE'
              }
              expanded={feedExpanded}
              onToggle={setFeedExpanded}
              onClose={() => setFeedOpen(false)}
              highlightedAgent={hAgent}
              connected={true}
            />
          </div>
          )}
        </div>

        {/* Mobile drawer scrim — taps close any open drawer. */}
        <div className="cr-scrim" onClick={closeDrawers} />
      </div>

      <ComposerDock
        bundleId={bundle?.id ?? null}
        agents={data?.agents ?? []}
        online={online}
        progress={{ done: doneCount, total: totalCount, events: eventCount }}
        onTaskCreated={handleTaskCreated}
        disabled={!data || !bundle}
        variant={isWide ? 'desktop' : 'mobile'}
      />

      {/* Pop-out overlays — URL-driven via ?popout=. */}
      {popoutKind === 'cookbook' && (
        <CookbookPopout
          cookbookId={data?.recipe?.cookbook_id ?? ''}
          onClose={() => closePopout(router, recipeId, bundleIdFromUrl)}
        />
      )}
      {popoutKind === 'history' && (
        <RecipeHistoryPopout
          recipeId={recipeId}
          onClose={() => closePopout(router, recipeId, bundleIdFromUrl)}
        />
      )}
      {popoutKind === 'review' && (bundleIdFromUrl || bundle?.id) && (
        <BundleReviewPopout
          recipeId={recipeId}
          bundleId={bundleIdFromUrl || bundle!.id}
          onClose={() => closePopout(router, recipeId, bundleIdFromUrl)}
        />
      )}
    </div>
  )
}

function closePopout(
  router: ReturnType<typeof useRouter>,
  recipeId: string,
  bundleId: string | null,
): void {
  const q = bundleId ? `?bundle=${bundleId}` : ''
  router.replace(`/recipes/${recipeId}${q}`)
}
