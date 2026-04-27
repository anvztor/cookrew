/**
 * ArcadeWorkspace — main screen for /recipes/[recipeId].
 *
 * Wires the Pip-Boy/Tamagotchi components to real cookrew data:
 *   - WorkspaceData  (recipe, members, agents, bundles, selected_bundle)
 *   - useTaskStream  (per-task live state for the mission board)
 *   - useWatch       (triggers a workspace reload on any SSE event)
 *   - createBundle   (composer dock "SHIP ▶")
 *   - rerunBundle    (blocked banner)
 *
 * Layout:
 *   ┌──────────────── TopHUD ────────────────┐
 *   │  [BlockedBanner (if any task blocked)] │
 *   ├────────┬──────────────────────────────┤
 *   │ Party  │   Mission Board       [Feed] │
 *   │ (side) │   (stage, scrolls)    (pip)  │
 *   ├────────┴──────────────────────────────┤
 *   │           Composer Dock                │
 *   └────────────────────────────────────────┘
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Bundle, WorkspaceData } from '@cookrew/shared'
import { cancelTask, getWorkspaceData, rerunBundle } from '@/lib/api'
import { useAuthContext } from '@/components/auth-provider'
import { useWatch } from '@/hooks/use-watch'
import { useTaskStream } from '@/hooks/use-task-stream'

import { AgentDetailOverlay } from './agent-detail-overlay'
import { ArcadeSidebar } from './arcade-sidebar'
import { ComposerDock } from './composer-dock'
import { EventFeed } from './event-feed'
import { HITLBarStrip, PromptCard, buildHitlPrompts } from './hitl-bars'
import { MissionBoard } from './mission-board'
import { SandboxWindow } from './sandbox-window'
import type { PartyMember } from './mapping'
import { TaskLiveCard } from './task-live-card'
import { TopHUD } from './top-hud'
import { PixelBtn } from './pixel-chrome'
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
          fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
          fontSize: 10,
        }}
      >
        !
      </div>
      <div className="pc-silk" style={{ fontSize: 10 }}>
        {count > 0 ? `${count} QUEST${count > 1 ? 'S' : ''} BLOCKED` : 'BUNDLE BLOCKED'} ·{' '}
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          {reason ?? 'awaiting operator action'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <PixelBtn size="tiny" onClick={onRerun} disabled={rerunning}>
        ↻ {rerunning ? 'RERUNNING…' : 'RERUN'}
      </PixelBtn>
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
  const { username, accountId } = useAuthContext()
  const requestedBy = username || accountId || 'anonymous'

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [hAgent, setHAgent] = useState<string | null>(null)
  const [hTask, setHTask] = useState<string | null>(null)
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [feedOpen, setFeedOpen] = useState(true)
  // HITL prompt visibility: default 'bar' for any blocked task; 'full'
  // when the user clicked it open; 'dismissed' when actioned. Falls
  // back to 'bar' for unknown ids so newly-blocked tasks surface as bars.
  const [promptStates, setPromptStates] = useState<
    Record<string, 'bar' | 'full' | 'dismissed'>
  >({})
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<PartyMember | null>(null)

  const startedAtRef = useRef(Date.now())
  const [elapsedTick, setElapsedTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsedTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(
    async (nextBundleId?: string | null, withLoading = false) => {
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
    [recipeId],
  )

  useEffect(() => {
    void load(bundleIdFromUrl, true)
  }, [bundleIdFromUrl, load])

  // Throttle reloads — useTaskStream already handles live state, so
  // firing load() on every SSE event just flickered the MissionBoard.
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

  // Live task state (per-task aggregated SSE state)
  const liveStatesReadonly = useTaskStream(recipeId, {
    bundleId: bundle?.id,
    terminalLingerMs: 0,
  })
  const liveStates = liveStatesReadonly as Readonly<Record<string, import('@/hooks/use-task-stream').TaskLiveState>>

  // View models
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

  // HITL prompts derived from blocked tasks. Re-tick every 30s so the
  // ages on the bars stay roughly accurate without rebuilding on every
  // render.
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
    // hitlTick deliberately participates so age strings refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quests, liveStates, hitlTick],
  )
  const hitlBars = hitlPrompts.filter(
    (p) => promptStates[p.id] !== 'full' && promptStates[p.id] !== 'dismissed',
  )
  const hitlFullPrompts = hitlPrompts.filter((p) => promptStates[p.id] === 'full')

  // Hover linking between party ↔ quest
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
  const blockedCount = quests.filter((q) => q.status === 'blocked').length
  const elapsed = formatElapsed(elapsedTick, startedAtRef.current)
  const reviewHref = bundle
    ? `/recipes/${recipeId}?popout=review&bundle=${bundle.id}`
    : null
  const cookbookHref = `/recipes/${recipeId}?popout=cookbook${bundleIdFromUrl ? `&bundle=${bundleIdFromUrl}` : ''}`
  const historyHref = `/recipes/${recipeId}?popout=history${bundleIdFromUrl ? `&bundle=${bundleIdFromUrl}` : ''}`

  // Real counters surfaced to the composer dock's HUD. No synthetic
  // gamification math — we show actual bundle progress: done tasks
  // out of total, and total events seen on this bundle.
  const doneCount = useMemo(
    () => quests.filter((q) => q.status === 'done').length,
    [quests],
  )
  const totalCount = quests.length
  const eventCount = allEvents.length

  const handleBundleCreated = useCallback(
    (bundleId: string) => {
      router.push(`/recipes/${recipeId}?bundle=${bundleId}`)
    },
    [recipeId, router],
  )

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
        className="pc-mono"
        style={{
          padding: '3px 6px',
          fontSize: 10,
          background: '#111',
          color: '#FFEDB0',
          border: '1px solid #FFEDB0',
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
        className="pc-root"
        style={{
          padding: 40,
          minHeight: '100vh',
          color: 'var(--ink)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        <div className="pc-display" style={{ fontSize: 16, marginBottom: 12 }}>
          LOAD FAILED
        </div>
        <div>{error}</div>
      </div>
    )
  }

  return (
    <div
      className="pc-root pc-arcade-scan"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cream)',
        fontFamily: "var(--font-inter), Inter, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <TopHUD
        recipe={data?.recipe ?? null}
        selectedBundle={bundle}
        onlineAgents={online}
        blockedCount={blockedCount}
        elapsed={elapsed}
        cookbookHref={cookbookHref}
        historyHref={historyHref}
        reviewHref={reviewHref}
        bundleSelector={bundleSelector}
        onSandbox={() => setSandboxOpen(true)}
      />

      {/* Bundle-level block stays in the banner (rerun is bundle-scoped).
          Per-task blocks surface as HITL clickbars on the mission board. */}
      {bundle?.status === 'blocked' && (
        <BlockedBanner
          count={blockedCount}
          reason={bundle?.blocked_reason ?? null}
          onRerun={() => void handleRerun()}
          rerunning={rerunning}
        />
      )}

      <div
        style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}
      >
        <ArcadeSidebar
          humans={humans}
          agents={agents}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onHoverAgent={setHAgent}
          highlightedAgent={effHAgent}
          activeAgent={selectedMember?.id ?? null}
          onSelectAgent={(m) =>
            setSelectedMember((prev) => (prev?.id === m.id ? null : m))
          }
        />

        {/* Stage — mission board (scrollable) */}
        <div
          className="pc-stage-bg"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Stage header */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px dashed var(--line)',
              background: 'rgba(250,248,244,0.8)',
              backdropFilter: 'blur(4px)',
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="pc-silk"
                style={{ fontSize: 9, color: 'var(--muted)' }}
              >
                ▸ MISSION BOARD · BUNDLE
              </div>
              <div
                className="pc-display"
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60ch',
                }}
                title={missionHeader.title}
              >
                “{missionHeader.title}”
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div className="pc-chip emerald">
                {missionHeader.clearedCount}/{missionHeader.totalCount} CLEARED
              </div>
              <div className="pc-chip amber">{missionHeader.workingCount} WORKING</div>
              <div className="pc-chip rose">{missionHeader.blockedCount} BLOCKED</div>
              <div style={{ width: 1, height: 20, background: 'var(--line-soft)' }} />
              <PixelBtn size="tiny" onClick={() => void load(bundle?.id, false)}>
                REFRESH
              </PixelBtn>
            </div>
          </div>

          {/* Board canvas — ReactFlow handles its own pan/zoom, so this
              container is fixed-sized (no overflow auto). */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              paddingRight:
                !feedOpen || feedExpanded || selectedQuestId ? 0 : 356,
              transition: 'padding-right 180ms ease',
            }}
          >
            {isLoading && !data ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                }}
              >
                <div
                  className="pc-silk"
                  style={{ fontSize: 11, color: 'var(--ink-soft)' }}
                >
                  ▸ LOADING WORKSPACE…
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

            {/* HITL clickbars — pinned bottom-left of the mission board. */}
            <HITLBarStrip
              items={hitlBars}
              onRestore={(id) =>
                setPromptStates((s) => ({ ...s, [id]: 'full' }))
              }
            />

            {/* Floating PromptCards for any HITL prompt the user opened. */}
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
                        // Silently swallow — task may already be cancelled
                        // or the user lacks permission. The watch stream
                        // will reconcile state on the next tick.
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

            {/* Sandbox popout — opened by clicking the recipe chip. */}
            {sandboxOpen && (
              <SandboxWindow
                recipe={data?.recipe ?? null}
                members={data?.members ?? []}
                agents={data?.agents ?? []}
                onClose={() => setSandboxOpen(false)}
              />
            )}

            {/* Agent / human detail overlay — opened by clicking a sidebar row. */}
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
          </div>

          {/* Pip-Boy Feed popout — hidden when MIN'd or a task-live-card overlay is open. */}
          {feedOpen && !selectedQuestId && (
            <EventFeed
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
          )}

          {/* Per-task live drill-in overlay */}
          {selectedQuestId && (() => {
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

      <ComposerDock
        recipeId={recipeId}
        requestedBy={requestedBy}
        agents={data?.agents ?? []}
        online={online}
        progress={{ done: doneCount, total: totalCount, events: eventCount }}
        onBundleCreated={handleBundleCreated}
        disabled={!data}
        onAgentsClick={() => setSidebarCollapsed((c) => !c)}
        onEventsClick={() => setFeedOpen((o) => !o)}
        eventsOpen={feedOpen}
      />

      {/* Pop-out overlays — URL-driven via ?popout=. They fetch their
          own data so they can open even before the workspace is fully
          loaded (e.g. a direct-link from the legacy route redirects). */}
      {popoutKind === 'cookbook' && (
        <CookbookPopout
          // Defer cookbook id resolution to the inner popout if the
          // workspace hasn't loaded yet — it'll show a loading row.
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

function formatElapsed(_tick: number, startedAt: number): string {
  const diff = Math.max(0, Date.now() - startedAt)
  const secs = Math.floor(diff / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
