'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  Clock3,
  FolderGit2,
  History,
  Plus,
  RadioTower,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  AgentStatusBadge,
  BundleStatusBadge,
  EventTypeBadge,
  TaskStatusBadge,
} from '@/components/status-badge'
import { createBundle, getWorkspaceData } from '@/lib/api'
import { formatRelativeTime, truncateText } from '@/lib/format'
import { useRecipeStream } from '@/hooks/use-sse'
import type { WorkspaceData } from '@/types'

interface WorkspaceScreenProps {
  readonly recipeId: string
}

export function WorkspaceScreen({ recipeId }: WorkspaceScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bundleIdFromUrl = searchParams.get('bundle')
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [requestedBy, setRequestedBy] = useState('cookrew@local')
  const [taskSeedText, setTaskSeedText] = useState('')
  const [showTaskSeeds, setShowTaskSeeds] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async (nextBundleId?: string | null, withLoading = false) => {
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
  }, [recipeId])

  useEffect(() => {
    void load(bundleIdFromUrl, true)
  }, [bundleIdFromUrl, load])

  useRecipeStream(recipeId, () => {
    void load(data?.selectedBundleId ?? bundleIdFromUrl, false)
  })

  const selectedBundle = data?.selectedBundle ?? null
  const selectedBundleId = data?.selectedBundleId ?? null

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

  function handleSelectBundle(bundleId: string) {
    router.replace(`/recipes/${recipeId}?bundle=${bundleId}`)
    void load(bundleId, false)
  }

  return (
    <div className="page-shell">
      <div className="page-frame min-h-[calc(100vh-40px)] overflow-hidden">
        <header className="page-header">
          <div>
            <p className="page-kicker">Cookrew / Recipe Workspace</p>
            <h1 className="page-title">
              {data?.recipe.name ?? 'Workspace'}
            </h1>
            <p className="page-copy">
              Presence, event feed, and the selected bundle all stay in view so
              orchestration work can move without losing context.
            </p>
          </div>

          <div className="button-row">
            <Link
              href={`/recipes/${recipeId}/history`}
              className="button-base button-secondary"
            >
              <History size={16} />
              Approved History
            </Link>
            {selectedBundle?.digest ? (
              <Link
                href={`/recipes/${recipeId}/bundles/${selectedBundle.bundle.id}/digest`}
                className="button-base button-primary"
              >
                <ArrowUpRight size={16} />
                Review Digest
              </Link>
            ) : null}
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-sm text-text-secondary">
            Loading workspace…
          </div>
        ) : error ? (
          <div className="p-6 text-sm font-medium text-rose-600">{error}</div>
        ) : !data ? (
          <div className="p-6">
            <div className="empty-state">This recipe could not be found.</div>
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-137px)] gap-px bg-border-strong xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className="surface-grid bg-bg-surface p-4">
              <div className="panel p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FolderGit2 size={16} />
                  Recipe Overview
                </p>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="field-label mb-1">Repository</p>
                    <p className="break-all">{data.recipe.repoUrl}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="metric-card">
                      <p className="field-label mb-1">Default Branch</p>
                      <p className="text-lg font-semibold">
                        {data.recipe.defaultBranch}
                      </p>
                    </div>
                    <div className="metric-card">
                      <p className="field-label mb-1">Created</p>
                      <p className="text-sm font-semibold">
                        {formatRelativeTime(data.recipe.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Users size={16} />
                  Members
                </p>
                <div className="space-y-3">
                  {data.members.map((member) => (
                    <div key={member.id} className="panel-muted p-3">
                      <p className="font-medium">{member.actorId}</p>
                      <p className="tiny-copy mt-1">
                        {member.role} · joined{' '}
                        {formatRelativeTime(member.joinedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <RadioTower size={16} />
                  Agent Presence
                </p>
                <div className="space-y-3">
                  {data.agents.map((agent) => (
                    <div key={agent.agentId} className="panel-muted p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{agent.displayName}</p>
                          <p className="tiny-copy mt-1">
                            {agent.capabilities.join(' · ')}
                          </p>
                        </div>
                        <AgentStatusBadge status={agent.status} />
                      </div>
                      <p className="tiny-copy mt-2">
                        Last heartbeat {formatRelativeTime(agent.lastHeartbeatAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Clock3 size={16} />
                  Recent Digests
                </p>
                <div className="space-y-3">
                  {data.recentDigests.length === 0 ? (
                    <div className="tiny-copy">No approved digests yet.</div>
                  ) : (
                    data.recentDigests.map((digest) => (
                      <Link
                        key={digest.id}
                        href={`/recipes/${recipeId}/bundles/${digest.bundleId}/digest`}
                        className="panel-muted block p-3"
                      >
                        <p className="font-medium">
                          {truncateText(digest.summary, 72)}
                        </p>
                        <p className="tiny-copy mt-1">
                          {formatRelativeTime(digest.submittedAt)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </aside>

            <main className="flex min-h-0 flex-col bg-bg-primary">
              <div className="flex items-center justify-between border-b border-border-strong px-4 py-4 md:px-6">
                <div>
                  <p className="text-lg font-semibold">Event Feed</p>
                  <p className="tiny-copy mt-1">
                    {selectedBundle
                      ? `Selected bundle ${selectedBundle.bundle.id}`
                      : 'Pick a bundle to inspect its feed.'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="field-label mb-1">Bundle Status</p>
                  {selectedBundle ? (
                    <BundleStatusBadge status={selectedBundle.bundle.status} />
                  ) : (
                    <span className="tiny-copy">No bundle selected</span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                {selectedBundle ? (
                  <div className="space-y-3">
                    {selectedBundle.events.map((event) => (
                      <article key={event.id} className="panel p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <EventTypeBadge type={event.type} />
                            <span className="text-sm font-medium">
                              {event.actorId}
                            </span>
                          </div>
                          <span className="tiny-copy">
                            {formatRelativeTime(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6">{event.body}</p>
                        {event.facts.length > 0 || event.codeRefs.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.facts.length > 0 ? (
                              <span className="tiny-copy rounded-full border border-border-subtle px-2 py-1">
                                {event.facts.length} fact refs
                              </span>
                            ) : null}
                            {event.codeRefs.length > 0 ? (
                              <span className="tiny-copy rounded-full border border-border-subtle px-2 py-1">
                                {event.codeRefs.length} code refs
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    Select a bundle from the right panel to see the matching
                    event feed.
                  </div>
                )}
              </div>

              <div className="border-t border-border-strong bg-bg-surface px-4 py-4 md:px-6">
                <div className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Prompt Composer</p>
                      <p className="tiny-copy mt-1">
                        Open a new bundle directly from the workspace. Starter
                        tasks are optional.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTaskSeeds((current) => !current)}
                      className="button-base button-secondary"
                    >
                      <Plus size={16} />
                      {showTaskSeeds ? 'Hide task seeds' : 'Add task seeds'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="block">
                      <span className="field-label">Prompt</span>
                      <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        className="text-area"
                        placeholder="Describe the orchestration work the next bundle should cover…"
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Requested By</span>
                      <input
                        value={requestedBy}
                        onChange={(event) => setRequestedBy(event.target.value)}
                        className="text-input"
                      />
                    </label>

                    {showTaskSeeds ? (
                      <label className="block">
                        <span className="field-label">
                          Optional Task Seeds
                        </span>
                        <textarea
                          value={taskSeedText}
                          onChange={(event) =>
                            setTaskSeedText(event.target.value)
                          }
                          className="text-area"
                          placeholder={`Scope the bundle\nImplement the API client\nReview the digest path`}
                        />
                      </label>
                    ) : null}

                    <div className="button-row justify-between">
                      <p className="tiny-copy max-w-[48ch]">
                        If you leave task seeds empty, Cookrew generates a small
                        starter list so the bundle is immediately actionable.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleBundleCreate()}
                        className="button-base button-primary"
                        disabled={isSubmitting}
                      >
                        <Send size={16} />
                        {isSubmitting ? 'Opening…' : 'Open Bundle'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            <aside className="surface-grid bg-bg-surface p-4">
              <div className="panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Bundles</p>
                    <p className="tiny-copy mt-1">
                      Choose a bundle to focus the center feed and detail panel.
                    </p>
                  </div>
                  <Sparkles size={18} className="text-accent-secondary" />
                </div>

                <div className="mt-4 space-y-3">
                  {data.bundles.map((bundle) => (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => handleSelectBundle(bundle.id)}
                      aria-pressed={selectedBundleId === bundle.id}
                      className={`w-full border p-3 text-left transition ${
                        selectedBundleId === bundle.id
                          ? 'border-border-strong bg-accent-primary-light'
                          : 'border-border-subtle bg-white/70 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{bundle.id}</p>
                          <p className="tiny-copy mt-1">
                            {truncateText(bundle.prompt, 74)}
                          </p>
                        </div>
                        <BundleStatusBadge status={bundle.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedBundle ? (
                <div className="panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Selected Bundle</p>
                      <p className="tiny-copy mt-1">
                        {selectedBundle.bundle.id}
                      </p>
                    </div>
                    <BundleStatusBadge status={selectedBundle.bundle.status} />
                  </div>

                  <p className="mt-4 text-sm leading-6">
                    {selectedBundle.bundle.prompt}
                  </p>

                  {selectedBundle.bundle.blockedReason ? (
                    <div className="mt-4 rounded border border-rose-600/30 bg-rose-50 p-3 text-sm text-rose-700">
                      {selectedBundle.bundle.blockedReason}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {selectedBundle.tasks.map((task) => (
                      <div key={task.id} className="panel-muted p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{task.title}</p>
                            <p className="tiny-copy mt-1">
                              {task.dependsOnTaskIds.length > 0
                                ? `Depends on ${task.dependsOnTaskIds.join(', ')}`
                                : 'No dependencies'}
                            </p>
                          </div>
                          <TaskStatusBadge status={task.status} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="button-row mt-4">
                    {selectedBundle.digest ? (
                      <Link
                        href={`/recipes/${recipeId}/bundles/${selectedBundle.bundle.id}/digest`}
                        className="button-base button-primary"
                      >
                        <ArrowUpRight size={16} />
                        Open Digest Review
                      </Link>
                    ) : null}
                    <Link
                      href={`/recipes/${recipeId}/history`}
                      className="button-base button-secondary"
                    >
                      <History size={16} />
                      Open History
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  No bundle selected yet. Open one from the list above.
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
