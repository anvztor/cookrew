'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  Bot,
  Filter,
  FolderGit2,
  History,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { CreateRecipeDialog } from '@/components/create-recipe-dialog'
import { BundleStatusBadge } from '@/components/status-badge'
import { getCookbookData } from '@/lib/api'
import {
  formatRelativeTime,
  formatTimestamp,
  truncateText,
} from '@/lib/format'
import type { BundleStatus, CookbookData, RecipeSummary } from '@/types'

type StatusFilter = 'all' | BundleStatus

export function CookbookScreen() {
  const router = useRouter()
  const [data, setData] = useState<CookbookData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const nextData = await getCookbookData()
        if (!isMounted) {
          return
        }

        setData(nextData)
        setSelectedRecipeId((current) => current ?? nextData.selectedRecipeId)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load cookbook.'
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const visibleRecipes = (data?.recipes ?? []).filter((summary) => {
    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      summary.recipe.name
        .toLowerCase()
        .includes(deferredSearch.trim().toLowerCase()) ||
      summary.recipe.repoUrl
        .toLowerCase()
        .includes(deferredSearch.trim().toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || summary.activeBundle?.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const selectedSummary =
    visibleRecipes.find((summary) => summary.recipe.id === selectedRecipeId) ??
    data?.recipes.find((summary) => summary.recipe.id === selectedRecipeId) ??
    visibleRecipes[0] ??
    data?.recipes[0] ??
    null

  function handleCreated(recipe: RecipeSummary['recipe']) {
    setIsCreateOpen(false)
    router.push(`/recipes/${recipe.id}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary font-sans text-text-primary">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="page-header">
          <div className="flex items-center gap-1">
            <h1 className="text-[22px] font-bold uppercase leading-none text-text-primary tracking-wide">
              Cookrew / Cookbook
            </h1>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <label className="relative block min-w-[280px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recipes, repos, or owners…"
                className="w-full border border-border-strong bg-bg-surface px-3 py-2.5 pl-9 text-[13px] text-text-primary outline-none transition-colors focus:border-text-primary"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="button-base button-primary"
            >
              <Plus size={16} />
              Create Recipe
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden bg-bg-primary">
          <aside className="flex w-[300px] flex-shrink-0 flex-col gap-5 border-r border-border-strong bg-bg-surface p-5 overflow-y-auto">
            {selectedSummary ? (
              <>
                <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                  <p className="text-[18px] font-bold text-text-primary">Selected Repo</p>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full border border-border-strong bg-accent-primary-light p-2">
                      <FolderGit2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {selectedSummary.recipe.name}
                      </p>
                      <p className="tiny-copy mt-1 break-all">
                        {selectedSummary.recipe.repoUrl}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Default Branch</p>
                      <p className="text-[18px] font-bold text-text-primary">
                        {selectedSummary.recipe.defaultBranch}
                      </p>
                    </div>
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Last Digest</p>
                      <p className="text-[14px] font-bold text-text-primary">
                        {selectedSummary.latestDigest
                          ? formatRelativeTime(selectedSummary.latestDigest.submittedAt)
                          : 'No approved digest yet'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                  <p className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                    <Users size={16} />
                    Team
                  </p>
                  <div className="space-y-3">
                    {selectedSummary.owners.map((owner) => (
                      <div key={owner} className="panel-muted p-3">
                        <p className="font-medium">{owner}</p>
                        <p className="tiny-copy mt-1">Recipe owner</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                  <p className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                    <Bot size={16} />
                    Online Agents
                  </p>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[28px] font-bold text-text-primary">
                        {selectedSummary.onlineAgentCount}
                      </p>
                      <p className="tiny-copy mt-1">
                        active right now out of {selectedSummary.agentCount}
                      </p>
                    </div>
                    <p className="tiny-copy">
                      Workspace presence updates stream in over SSE once you
                      open a recipe.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                Pick a recipe row to preview the repo, owners, and live agent
                footprint.
              </div>
            )}
          </aside>

          <main className="flex-1 bg-bg-primary p-6">
            <div className="flex flex-col border border-border-strong bg-bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-strong px-4 py-4">
                <div>
                  <p className="text-[18px] font-bold text-text-primary">Recipe Table</p>
                  <p className="tiny-copy mt-1">
                    {visibleRecipes.length} recipe
                    {visibleRecipes.length === 1 ? '' : 's'} visible
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <Filter size={14} className="text-text-secondary" />
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as StatusFilter)
                      }
                      className="select-input w-[160px]"
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="claimed">Claimed</option>
                      <option value="cooked">Cooked</option>
                      <option value="blocked">Blocked</option>
                      <option value="digested">Digested</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="hidden border-b border-border-subtle bg-stone-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary md:grid md:grid-cols-[minmax(0,2.4fr)_110px_120px_150px_140px]">
                <span>Name</span>
                <span>Status</span>
                <span>Owner</span>
                <span>Last Updated</span>
                <span>Actions</span>
              </div>

              {isLoading ? (
                <div className="p-6 text-sm text-text-secondary">
                  Loading cookbook…
                </div>
              ) : error ? (
                <div className="p-6 text-sm font-medium text-rose-600">
                  {error}
                </div>
              ) : visibleRecipes.length === 0 ? (
                <div className="p-6">
                  <div className="empty-state">
                    No recipes match that search. Try clearing the filter or
                    creating a new recipe.
                  </div>
                </div>
              ) : (
                <div>
                  {visibleRecipes.map((summary) => {
                    const bundleLink = summary.activeBundle
                      ? `/recipes/${summary.recipe.id}?bundle=${summary.activeBundle.id}`
                      : `/recipes/${summary.recipe.id}`

                    return (
                      <article
                        key={summary.recipe.id}
                        className="table-row md:grid-cols-[minmax(0,2.4fr)_110px_120px_150px_140px]"
                        onMouseEnter={() => setSelectedRecipeId(summary.recipe.id)}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeId(summary.recipe.id)}
                          className="text-left"
                        >
                          <p className="font-semibold">{summary.recipe.name}</p>
                          <p className="tiny-copy mt-1">
                            {truncateText(summary.recipe.repoUrl, 58)}
                          </p>
                          <p className="tiny-copy mt-2">
                            {summary.memberCount} members · {summary.agentCount}{' '}
                            agents · {summary.activeBundleCount} active bundles
                          </p>
                        </button>

                        <div>
                          {summary.activeBundle ? (
                            <BundleStatusBadge
                              status={summary.activeBundle.status}
                            />
                          ) : (
                            <span className="tiny-copy">No active bundle</span>
                          )}
                        </div>

                        <div className="text-sm font-medium">
                          {summary.owners[0] ?? summary.recipe.createdBy}
                        </div>

                        <div className="tiny-copy">
                          {summary.latestDigest
                            ? formatRelativeTime(summary.latestDigest.submittedAt)
                            : formatRelativeTime(summary.recipe.createdAt)}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={bundleLink} className="button-inline">
                            Open
                            <ArrowUpRight size={14} />
                          </Link>
                          <Link
                            href={`/recipes/${summary.recipe.id}/history`}
                            className="button-inline"
                          >
                            <History size={14} />
                            History
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedSummary?.latestDigest ? (
              <div className="mt-4 panel p-4">
                <p className="text-[18px] font-bold text-text-primary">Latest Approved Digest</p>
                <p className="font-medium">
                  {truncateText(selectedSummary.latestDigest.summary, 220)}
                </p>
                <p className="tiny-copy mt-2">
                  Submitted {formatTimestamp(selectedSummary.latestDigest.submittedAt)}
                </p>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      <CreateRecipeDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
