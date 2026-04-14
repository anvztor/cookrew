'use client'

import { Bot } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Group as PanelGroup, Panel } from 'react-resizable-panels'
import { createBundle, getWorkspaceData, rerunBundle } from '@/lib/api'
import { useAuthContext } from '@/components/auth-provider'
import { useWatch } from '@/hooks/use-watch'
import type { WorkspaceData } from '@cookrew/shared'
import {
  agentTone,
  buildDependencyRows,
  countArtifactPaths,
  getCapabilityRows,
  matchesQuery,
  pickTargetAgent,
  readAgentActivity,
} from './helpers'
import { WorkspaceCenterPane } from './center-pane'
import { WorkspaceHeader } from './header'
import { WorkspaceLeftPane } from './left-pane'
import { WorkspaceResizeHandle } from './resize-handle'
import { WorkspaceRightPane } from './right-pane'
import type { WorkspaceScreenProps } from './types'

export function WorkspaceScreen({ recipeId }: WorkspaceScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bundleIdFromUrl = searchParams.get('bundle')
  const { authenticated, username, accountId, login } = useAuthContext()

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [prompt, setPrompt] = useState('')
  const requestedBy = username || accountId || 'anonymous'
  const [taskSeedText, setTaskSeedText] = useState('')
  const [showTaskSeeds, setShowTaskSeeds] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRerunning, setIsRerunning] = useState(false)

  const deferredWorkspaceSearch = useDeferredValue(workspaceSearch)

  const load = useCallback(
    async (nextBundleId?: string | null, withLoading = false) => {
      if (withLoading) {
        setIsLoading(true)
      }

      setError(null)

      try {
        const nextData = await getWorkspaceData(recipeId, nextBundleId)
        setData(nextData)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load workspace.'
        )
      } finally {
        if (withLoading) {
          setIsLoading(false)
        }
      }
    },
    [recipeId]
  )

  useEffect(() => {
    void load(bundleIdFromUrl, true)
  }, [bundleIdFromUrl, load])

  const selectedBundle = data?.selected_bundle ?? null
  const selectedBundleId = data?.selected_bundle_id ?? null
  const allBundles = data?.bundles ?? []

  const handleSelectBundle = useCallback(
    (bundleId: string) => {
      router.push(`/recipes/${recipeId}?bundle=${bundleId}`)
    },
    [recipeId, router]
  )

  const handleCancelBundle = useCallback(
    async (bundleId: string) => {
      // Cancel via krewhub PATCH /api/v1/bundles/{bundle_id}
      try {
        await fetch(`/api/v1/bundles/${bundleId}`, { method: 'PATCH', credentials: 'include' })
      } catch {
        // Ignore — the bundle list will refresh via watch
      }
      void load(selectedBundleId, false)
    },
    [recipeId, selectedBundleId, load]
  )

  useWatch(recipeId, () => {
    void load(selectedBundleId ?? bundleIdFromUrl, false)
  })

  const query = deferredWorkspaceSearch.trim().toLowerCase()
  const allTasks = selectedBundle?.tasks ?? []
  const blockedTaskCount = allTasks.filter((task) => task.status === 'blocked').length
  // Re-Run is valid whenever the *bundle* is blocked, not only when
  // individual tasks are. The graph runner can mark the bundle BLOCKED
  // (e.g. "no eligible gateway in pool") before a single task row
  // transitions out of `open`, and we still want the Re-Run affordance
  // to appear so the user can retry after re-onboarding agents.
  const bundleStatus = selectedBundle?.bundle.status
  const canRerun = blockedTaskCount > 0 || bundleStatus === 'blocked'
  const reviewHref = selectedBundle
    ? `/recipes/${recipeId}/bundles/${selectedBundle.bundle.id}/digest`
    : null
  const historyHref = `/recipes/${recipeId}/history`
  const allDependencies = buildDependencyRows(allTasks)
  const participantCount =
    (data?.members.length ?? 0) +
    (data?.agents.filter((agent) => agent.status !== 'offline').length ?? 0)
  const capabilityRows = getCapabilityRows(data?.agents ?? [])
  const bundleSequence =
    data && selectedBundle
      ? Math.max(
          1,
          data.bundles.findIndex((bundle) => bundle.id === selectedBundle.bundle.id) + 1
        )
      : 1
  const visibleEvents = selectedBundle
    ? selectedBundle.events.filter((event) =>
        query.length === 0
          ? true
          : matchesQuery(query, [
              event.actor_id,
              event.type,
              event.body,
              ...event.facts.map((fact) => fact.claim),
              ...event.code_refs.flatMap((codeRef) => codeRef.paths),
            ])
      )
    : []
  const visibleTasks = allTasks.filter((task) =>
    query.length === 0
      ? true
      : matchesQuery(query, [
          task.title,
          task.status,
          task.blocked_reason ?? '',
          task.depends_on_task_ids.join(' '),
        ])
  )
  const visibleDependencies = allDependencies.filter((dependency) =>
    query.length === 0
      ? true
      : matchesQuery(query, [
          dependency.from.title,
          dependency.to.title,
          dependency.status,
        ])
  )
  const selectedAgent =
    pickTargetAgent(data?.agents ?? [], selectedBundle) ?? data?.agents[0] ?? null
  const completedTaskCount = allTasks.filter((task) => task.status === 'done').length
  const artifactCount = countArtifactPaths(selectedBundle)
  const warningCount =
    allTasks.filter((task) => task.status === 'blocked').length +
    allDependencies.filter((dependency) => dependency.status === 'pending').length +
    (selectedBundle?.bundle.blocked_reason ? 1 : 0)

  async function handleBundleCreate() {
    if (!authenticated) {
      login()
      return
    }

    if (!prompt.trim()) {
      setError('Bundle prompt is required.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const taskTitles = taskSeedText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const result = await createBundle(recipeId, {
        prompt: prompt.trim(),
        requested_by: requestedBy,
        task_titles: taskTitles,
      })

      setPrompt('')
      setTaskSeedText('')
      setShowTaskSeeds(false)
      router.replace(`/recipes/${recipeId}?bundle=${result.bundle_id}`)
      await load(result.bundle_id, false)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to create bundle.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRerunAction() {
    if (!selectedBundle) {
      setError('Create or select a bundle before rerunning blocked tasks.')
      return
    }

    if (!canRerun) {
      setError('No blocked tasks are available to rerun.')
      return
    }

    setError(null)
    setIsRerunning(true)

    try {
      const result = await rerunBundle(recipeId, selectedBundle.bundle.id)
      await load(result.bundle_id, false)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to rerun blocked tasks.'
      )
    } finally {
      setIsRerunning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#FAF8F4] text-[#2D2A20]">
        <WorkspaceHeader
          historyHref={historyHref}
          onSearchChange={setWorkspaceSearch}
          searchValue={workspaceSearch}
        />
        <div className="px-5 py-6 text-sm font-medium text-[#57534E]">
          Loading workspace…
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#FAF8F4] text-[#2D2A20]">
        <WorkspaceHeader
          historyHref={historyHref}
          onSearchChange={setWorkspaceSearch}
          searchValue={workspaceSearch}
        />
        <div className="px-5 py-6">
          <div className="border border-dashed border-[#2D2A20] bg-[#FFFEF5] px-5 py-6 text-sm text-[#57534E]">
            {error ?? 'This recipe could not be found.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#FAF8F4] text-[#2D2A20]">
      <WorkspaceHeader
        historyHref={historyHref}
        onSearchChange={setWorkspaceSearch}
        searchValue={workspaceSearch}
      />

      {error ? (
        <div className="border-b border-[#2D2A20] bg-[#FEF2F2] px-5 py-3 text-[13px] font-medium text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      <div className="hidden flex-1 overflow-hidden lg:block">
        <PanelGroup id="workspace-panels" orientation="horizontal" className="h-full">
          <Panel id="workspace-left" defaultSize="18%" minSize="16%" maxSize="30%">
            <WorkspaceLeftPane
              bundles={allBundles}
              capabilityRows={capabilityRows}
              data={data}
              onSelectBundle={handleSelectBundle}
              onCancelBundle={handleCancelBundle}
              participantCount={participantCount}
              selectedBundleId={selectedBundleId}
              testId="workspace-left-pane"
            />
          </Panel>

          <WorkspaceResizeHandle
            ariaLabel="Resize left sidebar"
            testId="workspace-left-resizer"
          />

          <Panel id="workspace-center" defaultSize="60%" minSize="34%">
            <WorkspaceCenterPane
              events={visibleEvents}
              hasQuery={query.length > 0}
              isSubmitting={isSubmitting}
              onCreateBundle={handleBundleCreate}
              onToggleTaskSeeds={() => setShowTaskSeeds((current) => !current)}
              prompt={prompt}
              requestedBy={requestedBy}
              selectedAgent={selectedAgent}
              selectedBundle={selectedBundle}
              setPrompt={setPrompt}
              setRequestedBy={() => {}}
              setTaskSeedText={setTaskSeedText}
              showTaskSeeds={showTaskSeeds}
              taskSeedText={taskSeedText}
              testId="workspace-center-pane"
            />
          </Panel>

          <WorkspaceResizeHandle
            ariaLabel="Resize right sidebar"
            testId="workspace-right-resizer"
          />

          <Panel id="workspace-right" defaultSize="22%" minSize="20%" maxSize="34%">
            <WorkspaceRightPane
              allDependencies={allDependencies}
              artifactCount={artifactCount}
              blockedTaskCount={blockedTaskCount}
              canRerun={canRerun}
              bundleSequence={bundleSequence}
              completedTaskCount={completedTaskCount}
              isRerunning={isRerunning}
              onRerunAction={handleRerunAction}
              reviewHref={reviewHref}
              selectedBundle={selectedBundle}
              testId="workspace-right-pane"
              visibleDependencies={visibleDependencies}
              visibleTasks={visibleTasks}
              warningCount={warningCount}
            />
          </Panel>
        </PanelGroup>
      </div>

      <MobileWorkspace
        data={data}
        allBundles={allBundles}
        capabilityRows={capabilityRows}
        selectedBundleId={selectedBundleId}
        participantCount={participantCount}
        onSelectBundle={handleSelectBundle}
        onCancelBundle={handleCancelBundle}
        visibleEvents={visibleEvents}
        query={query}
        isSubmitting={isSubmitting}
        onCreateBundle={handleBundleCreate}
        onToggleTaskSeeds={() => setShowTaskSeeds((current) => !current)}
        prompt={prompt}
        requestedBy={requestedBy}
        selectedAgent={selectedAgent}
        selectedBundle={selectedBundle}
        setPrompt={setPrompt}
        setRequestedBy={() => {}}
        setTaskSeedText={setTaskSeedText}
        showTaskSeeds={showTaskSeeds}
        taskSeedText={taskSeedText}
        allDependencies={allDependencies}
        artifactCount={artifactCount}
        blockedTaskCount={blockedTaskCount}
        canRerun={canRerun}
        bundleSequence={bundleSequence}
        completedTaskCount={completedTaskCount}
        isRerunning={isRerunning}
        onRerunAction={handleRerunAction}
        reviewHref={reviewHref}
        visibleDependencies={visibleDependencies}
        visibleTasks={visibleTasks}
        warningCount={warningCount}
      />
    </div>
  )
}

/* ── Mobile workspace — tabbed layout with agent status bar ── */

type MobileTab = 'events' | 'tasks' | 'info'

function MobileWorkspace(props: {
  data: WorkspaceData
  allBundles: WorkspaceData['bundles']
  capabilityRows: ReturnType<typeof getCapabilityRows>
  selectedBundleId: string | null
  participantCount: number
  onSelectBundle: (id: string) => void
  onCancelBundle: (id: string) => void
  visibleEvents: Parameters<typeof WorkspaceCenterPane>[0]['events']
  query: string
  isSubmitting: boolean
  onCreateBundle: () => void
  onToggleTaskSeeds: () => void
  prompt: string
  requestedBy: string
  selectedAgent: Parameters<typeof WorkspaceCenterPane>[0]['selectedAgent']
  selectedBundle: Parameters<typeof WorkspaceCenterPane>[0]['selectedBundle']
  setPrompt: (v: string) => void
  setRequestedBy: (v: string) => void
  setTaskSeedText: (v: string) => void
  showTaskSeeds: boolean
  taskSeedText: string
  allDependencies: Parameters<typeof WorkspaceRightPane>[0]['allDependencies']
  artifactCount: number
  blockedTaskCount: number
  canRerun: boolean
  bundleSequence: number
  completedTaskCount: number
  isRerunning: boolean
  onRerunAction: () => void
  reviewHref: string | null
  visibleDependencies: Parameters<typeof WorkspaceRightPane>[0]['visibleDependencies']
  visibleTasks: Parameters<typeof WorkspaceRightPane>[0]['visibleTasks']
  warningCount: number
}) {
  const [tab, setTab] = useState<MobileTab>('events')

  const tabs: { key: MobileTab; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'tasks', label: `Tasks (${props.visibleTasks.length})` },
    { key: 'info', label: 'Info' },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
      {/* Compact agent status bar */}
      <div className="flex items-center gap-3 overflow-x-auto border-b border-[#2D2A20] bg-[#FFFEF5] px-3 py-2">
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#57534E]">
          Agents
        </span>
        {props.data.agents.map((agent) => {
          const tone = agentTone(agent.status)
          const activity = readAgentActivity(agent)
          const dotColor = agent.status === 'online' ? 'bg-[#10B981]' : agent.status === 'busy' ? 'bg-[#9333EA]' : 'bg-[#A8A29E]'
          return (
            <div key={agent.agent_id} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-2.5 py-1">
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              <Bot size={12} className={tone.iconClassName} />
              <span className="text-[11px] font-medium text-[#2D2A20]">{agent.display_name}</span>
              <span className="text-[10px] text-[#57534E]">{activity}</span>
            </div>
          )
        })}
      </div>

      {/* Bundle status bar */}
      {props.selectedBundle && (
        <div className="flex items-center justify-between border-b border-[#2D2A20] bg-[#FFFEF5] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#2D2A20]">
              Bundle #{props.bundleSequence}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              props.selectedBundle.bundle.status === 'cooked' ? 'bg-emerald-100 text-emerald-800' :
              props.selectedBundle.bundle.status === 'blocked' ? 'bg-amber-100 text-amber-800' :
              props.selectedBundle.bundle.status === 'claimed' ? 'bg-violet-100 text-violet-800' :
              'bg-gray-100 text-gray-700'
            }`}>
              {props.selectedBundle.bundle.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#57534E]">
            <span>{props.completedTaskCount}/{props.visibleTasks.length} done</span>
            {props.warningCount > 0 && (
              <span className="text-amber-600">{props.warningCount} warnings</span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#2D2A20] bg-[#FFFEF5]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
              tab === t.key
                ? 'border-b-2 border-[#9B8ACB] text-[#2D2A20]'
                : 'text-[#57534E]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'events' && (
          <WorkspaceCenterPane
            events={props.visibleEvents}
            hasQuery={props.query.length > 0}
            isSubmitting={props.isSubmitting}
            mobile
            onCreateBundle={props.onCreateBundle}
            onToggleTaskSeeds={props.onToggleTaskSeeds}
            prompt={props.prompt}
            requestedBy={props.requestedBy}
            selectedAgent={props.selectedAgent}
            selectedBundle={props.selectedBundle}
            setPrompt={props.setPrompt}
            setRequestedBy={props.setRequestedBy}
            setTaskSeedText={props.setTaskSeedText}
            showTaskSeeds={props.showTaskSeeds}
            taskSeedText={props.taskSeedText}
          />
        )}
        {tab === 'tasks' && (
          <WorkspaceRightPane
            allDependencies={props.allDependencies}
            artifactCount={props.artifactCount}
            blockedTaskCount={props.blockedTaskCount}
            canRerun={props.canRerun}
            bundleSequence={props.bundleSequence}
            completedTaskCount={props.completedTaskCount}
            isRerunning={props.isRerunning}
            mobile
            onRerunAction={props.onRerunAction}
            reviewHref={props.reviewHref}
            selectedBundle={props.selectedBundle}
            visibleDependencies={props.visibleDependencies}
            visibleTasks={props.visibleTasks}
            warningCount={props.warningCount}
          />
        )}
        {tab === 'info' && (
          <WorkspaceLeftPane
            bundles={props.allBundles}
            capabilityRows={props.capabilityRows}
            data={props.data}
            mobile
            onSelectBundle={props.onSelectBundle}
            onCancelBundle={props.onCancelBundle}
            participantCount={props.participantCount}
            selectedBundleId={props.selectedBundleId}
          />
        )}
      </div>
    </div>
  )
}
