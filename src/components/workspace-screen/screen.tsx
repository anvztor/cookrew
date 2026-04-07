'use client'

import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Group as PanelGroup, Panel } from 'react-resizable-panels'
import { createBundle, getWorkspaceData, rerunBundle } from '@/lib/api'
import { useWatch } from '@/hooks/use-watch'
import type { WorkspaceData } from '@/types'
import {
  buildDependencyRows,
  countArtifactPaths,
  getCapabilityRows,
  matchesQuery,
  pickTargetAgent,
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

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [prompt, setPrompt] = useState('')
  const [requestedBy, setRequestedBy] = useState('cookrew@local')
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

  const selectedBundle = data?.selectedBundle ?? null
  const selectedBundleId = data?.selectedBundleId ?? null
  const allBundles = data?.bundles ?? []

  const handleSelectBundle = useCallback(
    (bundleId: string) => {
      router.push(`/recipes/${recipeId}?bundle=${bundleId}`)
    },
    [recipeId, router]
  )

  const handleCancelBundle = useCallback(
    async (bundleId: string) => {
      // Cancel via krewhub PATCH (through BFF proxy would be ideal,
      // but for now we just reload after navigation)
      try {
        await fetch(`/api/recipes/${recipeId}/bundles/${bundleId}/cancel`, { method: 'POST' })
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
              event.actorId,
              event.type,
              event.body,
              ...event.facts.map((fact) => fact.claim),
              ...event.codeRefs.flatMap((codeRef) => codeRef.paths),
            ])
      )
    : []
  const visibleTasks = allTasks.filter((task) =>
    query.length === 0
      ? true
      : matchesQuery(query, [
          task.title,
          task.status,
          task.blockedReason ?? '',
          task.dependsOnTaskIds.join(' '),
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
    (selectedBundle?.bundle.blockedReason ? 1 : 0)

  async function handleBundleCreate() {
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
        requestedBy: requestedBy.trim() || 'cookrew@local',
        taskTitles,
      })

      setPrompt('')
      setTaskSeedText('')
      setShowTaskSeeds(false)
      router.replace(`/recipes/${recipeId}?bundle=${result.bundleId}`)
      await load(result.bundleId, false)
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

    if (blockedTaskCount === 0) {
      setError('No blocked tasks are available to rerun.')
      return
    }

    setError(null)
    setIsRerunning(true)

    try {
      const result = await rerunBundle(recipeId, selectedBundle.bundle.id)
      await load(result.bundleId, false)
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
              setRequestedBy={setRequestedBy}
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

      <div className="flex flex-1 flex-col overflow-y-auto lg:hidden">
        <WorkspaceLeftPane
          bundles={allBundles}
          capabilityRows={capabilityRows}
          data={data}
          mobile
          onSelectBundle={handleSelectBundle}
          onCancelBundle={handleCancelBundle}
          participantCount={participantCount}
          selectedBundleId={selectedBundleId}
        />
        <WorkspaceCenterPane
          events={visibleEvents}
          hasQuery={query.length > 0}
          isSubmitting={isSubmitting}
          mobile
          onCreateBundle={handleBundleCreate}
          onToggleTaskSeeds={() => setShowTaskSeeds((current) => !current)}
          prompt={prompt}
          requestedBy={requestedBy}
          selectedAgent={selectedAgent}
          selectedBundle={selectedBundle}
          setPrompt={setPrompt}
          setRequestedBy={setRequestedBy}
          setTaskSeedText={setTaskSeedText}
          showTaskSeeds={showTaskSeeds}
          taskSeedText={taskSeedText}
        />
        <WorkspaceRightPane
          allDependencies={allDependencies}
          artifactCount={artifactCount}
          blockedTaskCount={blockedTaskCount}
          bundleSequence={bundleSequence}
          completedTaskCount={completedTaskCount}
          isRerunning={isRerunning}
          mobile
          onRerunAction={handleRerunAction}
          reviewHref={reviewHref}
          selectedBundle={selectedBundle}
          visibleDependencies={visibleDependencies}
          visibleTasks={visibleTasks}
          warningCount={warningCount}
        />
      </div>
    </div>
  )
}
