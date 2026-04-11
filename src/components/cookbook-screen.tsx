'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  Bot,
  BookOpen,
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
import type { AgentPresence, BundleStatus, CookbookData, CookbookGroup, RecipeSummary } from '@/types'

type StatusFilter = 'all' | BundleStatus

export function CookbookScreen() {
  const router = useRouter()
  const [data, setData] = useState<CookbookData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter] = useState<StatusFilter>('all')
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

  const allRecipes = (data?.cookbooks ?? []).flatMap((g) => g.recipes)

  const filterRecipe = (summary: RecipeSummary) => {
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
  }

  const selectedSummary =
    allRecipes.find((summary) => summary.recipe.id === selectedRecipeId) ??
    allRecipes[0] ??
    null

  const selectedCookbook = (data?.cookbooks ?? []).find((g) =>
    g.recipes.some((r) => r.recipe.id === selectedRecipeId)
  )

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
                      {selectedCookbook ? (
                        <p className="tiny-copy mt-1 flex items-center gap-1">
                          <BookOpen size={12} />
                          {selectedCookbook.cookbook.name}
                        </p>
                      ) : null}
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
                    {selectedCookbook ? (
                      <AgentList agents={selectedCookbook.agents} />
                    ) : (
                      <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                        <p className="text-[28px] font-bold text-text-primary">
                          {selectedSummary.onlineAgentCount}
                        </p>
                        <p className="tiny-copy mt-1">
                          active right now out of {selectedSummary.agentCount}
                        </p>
                      </div>
                    )}
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

          <main className="flex-1 bg-bg-primary p-6 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-sm text-text-secondary">
                Loading cookbook…
              </div>
            ) : error ? (
              <div className="p-6 text-sm font-medium text-rose-600">
                {error}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {(data?.cookbooks ?? []).map((group) => (
                  <CookbookGroupCard
                    key={group.cookbook.id}
                    group={group}
                    filterRecipe={filterRecipe}
                    selectedRecipeId={selectedRecipeId}
                    setSelectedRecipeId={setSelectedRecipeId}
                  />
                ))}

                {allRecipes.length === 0 ? (
                  <div className="p-6">
                    <div className="empty-state">
                      No recipes yet. Create one or run{' '}
                      <code className="text-xs bg-stone-200 px-1 py-0.5">krewcli onboard</code>{' '}
                      to get started.
                    </div>
                  </div>
                ) : null}
              </div>
            )}

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
        cookbookId={selectedCookbook?.cookbook.id ?? ''}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

function CookbookGroupCard({
  group,
  filterRecipe,
  selectedRecipeId,
  setSelectedRecipeId,
}: {
  group: CookbookGroup
  filterRecipe: (s: RecipeSummary) => boolean
  selectedRecipeId: string | null
  setSelectedRecipeId: (id: string) => void
}) {
  const onlineCount = group.agents.filter((a) => a.status !== 'offline').length

  return (
    <div className="flex flex-col border border-border-strong bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-strong px-4 py-3 bg-stone-50">
        <Link
          href={`/cookbooks/${group.cookbook.id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <BookOpen size={18} className="text-accent-primary" />
          <div>
            <p className="text-[16px] font-bold text-text-primary">{group.cookbook.name}</p>
            <p className="tiny-copy">
              {group.recipes.length} recipe{group.recipes.length === 1 ? '' : 's'}
              {' · '}
              {onlineCount} agent{onlineCount === 1 ? '' : 's'} online
              {' · '}
              owner: {group.cookbook.ownerId}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {group.agents
            .filter((a) => a.status !== 'offline')
            .map((agent) => (
              <span
                key={agent.agentId}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {agent.displayName}
              </span>
            ))}
        </div>
      </div>

      <RecipeRows
        recipes={group.recipes.filter(filterRecipe)}
        selectedRecipeId={selectedRecipeId}
        setSelectedRecipeId={setSelectedRecipeId}
      />
    </div>
  )
}

function RecipeRows({
  recipes,
  selectedRecipeId,
  setSelectedRecipeId,
}: {
  recipes: readonly RecipeSummary[]
  selectedRecipeId: string | null
  setSelectedRecipeId: (id: string) => void
}) {
  if (recipes.length === 0) {
    return (
      <div className="p-4">
        <p className="tiny-copy">No recipes match the current filter.</p>
      </div>
    )
  }

  return (
    <div>
      {recipes.map((summary) => {
        const bundleLink = summary.activeBundle
          ? `/recipes/${summary.recipe.id}?bundle=${summary.activeBundle.id}`
          : `/recipes/${summary.recipe.id}`

        return (
          <article
            key={summary.recipe.id}
            className={`table-row md:grid-cols-[minmax(0,2.4fr)_110px_120px_150px_140px] ${
              selectedRecipeId === summary.recipe.id ? 'bg-stone-50' : ''
            }`}
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
  )
}

function AgentList({ agents }: { agents: readonly AgentPresence[] }) {
  const online = agents.filter((a) => a.status !== 'offline')
  const offline = agents.filter((a) => a.status === 'offline')

  return (
    <>
      {online.length > 0 ? (
        <div className="space-y-2">
          {online.map((agent) => (
            <div key={agent.agentId} className="flex items-center justify-between border border-border-strong bg-bg-surface p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{agent.displayName}</p>
                  <p className="tiny-copy">
                    {agent.status === 'busy' ? 'Working' : 'Online'}
                    {agent.currentTaskId ? ` on ${agent.currentTaskId}` : ''}
                  </p>
                </div>
              </div>
              <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Not minted
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="tiny-copy">No agents online</p>
      )}
      {offline.length > 0 ? (
        <p className="tiny-copy mt-2">{offline.length} offline</p>
      ) : null}
      <MintAgentsInline />
    </>
  )
}

function MintAgentsInline() {
  const [ops, setOps] = useState<Array<{ id: string; display_name: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const resp = await fetch('/api/mint-ops')
        if (resp.ok) setOps(await resp.json())
      } catch { /* ignore */ }
    }
    fetchOps()
    const interval = setInterval(fetchOps, 5000)
    return () => clearInterval(interval)
  }, [])

  if (ops.length === 0) return null

  const mintAll = async () => {
    if (!(window as any).ethereum) return
    setLoading(true)
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      // For now, just confirm each op (actual handleOps call is in mint-agents-panel.tsx)
      for (const op of ops) {
        await fetch('/api/mint-ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', mint_id: op.id }),
        })
      }
      setOps([])
    } catch (err) {
      console.error('Mint failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded border-2 border-amber-400 bg-amber-50 p-3">
      <p className="text-[12px] font-bold text-amber-800">
        {ops.length} agent{ops.length > 1 ? 's' : ''} ready to mint on-chain
      </p>
      <p className="text-[11px] text-amber-700 mt-1">
        Mint ERC-8004 NFTs to register agents on GOAT Testnet3
      </p>
      <button
        onClick={() => void mintAll()}
        disabled={loading}
        className="mt-2 w-full rounded border border-amber-500 bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-300 disabled:opacity-50"
      >
        {loading ? 'Minting...' : 'Mint with Wallet'}
      </button>
    </div>
  )
}
