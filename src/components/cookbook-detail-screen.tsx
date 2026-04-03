'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import {
  ArrowUpDown,
  FolderOpen,
  GitBranch,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { CreateRecipeDialog } from '@/components/create-recipe-dialog'
import { getCookbookDetailData } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'
import type { AgentPresence, CookbookDetailData, RecipeMember, RecipeSummary } from '@/types'

export function CookbookDetailScreen({ cookbookId }: { cookbookId: string }) {
  const [data, setData] = useState<CookbookDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const nextData = await getCookbookDetailData(cookbookId)
        if (!isMounted) {
          return
        }
        setData(nextData)
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
  }, [cookbookId])

  const filteredRecipes = (data?.recipes ?? []).filter((summary) => {
    if (deferredSearch.trim().length === 0) {
      return true
    }
    const q = deferredSearch.trim().toLowerCase()
    return (
      summary.recipe.name.toLowerCase().includes(q) ||
      summary.recipe.repoUrl.toLowerCase().includes(q)
    )
  })

  function handleCreated() {
    setIsCreateOpen(false)
    void getCookbookDetailData(cookbookId).then(setData)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans text-text-primary">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-strong bg-bg-surface px-5 py-4">
        <h1 className="text-[22px] font-bold uppercase leading-none tracking-wide text-text-primary">
          Cookrew / Cookbook
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border-strong bg-bg-surface">
            <Search
              size={16}
              className="pointer-events-none ml-3 text-text-secondary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-[240px] bg-transparent px-3 py-2.5 text-[13px] text-text-primary outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="button-base button-primary"
          >
            <Plus size={16} className="text-[#9B8ACB]" />
            Create Recipe
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="p-6 text-sm text-text-secondary">Loading cookbook…</div>
      ) : error ? (
        <div className="p-6 text-sm font-medium text-rose-600">{error}</div>
      ) : data ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — 300px, matching design */}
          <Sidebar
            cookbook={data.cookbook}
            members={data.members}
            agents={data.agents}
          />

          {/* Main content */}
          <main className="flex flex-1 flex-col gap-5 overflow-y-auto bg-[#FAF8F4] p-6">
            {/* Title row */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-[26px] font-bold text-text-primary">Recipes</h2>
                <p className="text-[14px] text-text-secondary">
                  {data.recipes.length} recipe{data.recipes.length === 1 ? '' : 's'} in this cookbook
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button type="button" className="button-base button-secondary">
                  <SlidersHorizontal size={16} className="text-[#9B8ACB]" />
                  Filter
                </button>
                <button type="button" className="button-base button-secondary">
                  <ArrowUpDown size={16} className="text-[#9B8ACB]" />
                  Sort
                </button>
              </div>
            </div>

            {/* Recipe table */}
            <RecipeTable recipes={filteredRecipes} />
          </main>
        </div>
      ) : null}

      <CreateRecipeDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

/* ── Sidebar ── */

function Sidebar({
  cookbook,
  members,
  agents,
}: {
  cookbook: CookbookDetailData['cookbook']
  members: readonly RecipeMember[]
  agents: readonly AgentPresence[]
}) {
  const onlineAgents = agents.filter((a) => a.status !== 'offline')

  // Dedupe members for display
  const seenActors = new Set<string>()
  const uniqueMembers: RecipeMember[] = []
  for (const m of members) {
    if (!seenActors.has(m.actorId)) {
      seenActors.add(m.actorId)
      uniqueMembers.push(m)
    }
  }

  return (
    <aside className="flex w-[300px] flex-shrink-0 flex-col gap-5 overflow-y-auto border-r border-border-strong bg-bg-surface p-5">
      {/* Cookbook meta */}
      <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
        <p className="text-[16px] font-bold text-text-primary">{cookbook.name}</p>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Main recipe repository for bootstrapping and automation workflows.
        </p>
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[#9B8ACB]" />
          <span className="text-[13px] font-medium text-text-secondary">main</span>
          <span className="inline-flex items-center rounded-md bg-[#7EB5A6] px-2 py-[2px] text-[12px] font-medium text-white ring-1 ring-inset ring-[#5A9A8A]">
            synced
          </span>
        </div>
      </div>

      {/* Team */}
      <div className="flex flex-col gap-3.5 border border-border-strong bg-bg-surface p-4">
        <p className="text-[14px] font-bold text-text-primary">Team</p>
        {uniqueMembers.map((member) => (
          <MemberRow key={member.actorId} member={member} />
        ))}
        {uniqueMembers.length === 0 ? (
          <p className="text-[13px] text-text-secondary">No team members</p>
        ) : null}
      </div>

      {/* Online Agents */}
      <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-text-primary">Online Agents</p>
          {onlineAgents.length > 0 ? (
            <span className="inline-flex items-center rounded-md bg-accent-primary px-2 py-[2px] text-[12px] font-medium text-[#5C4A1F] ring-1 ring-inset ring-border-strong">
              {onlineAgents.length} active
            </span>
          ) : null}
        </div>
        {onlineAgents.length > 0 ? (
          onlineAgents.map((agent) => (
            <div key={agent.agentId} className="flex items-center gap-2.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#10B981]" />
              <span className="font-mono text-[12px] font-medium text-text-primary">
                {agent.displayName}
              </span>
            </div>
          ))
        ) : (
          <p className="text-[13px] text-text-secondary">No agents online</p>
        )}
      </div>
    </aside>
  )
}

function MemberRow({ member }: { member: RecipeMember }) {
  const isOwner = member.role === 'owner'
  const isOffline = member.actorType === 'agent'

  // Dot colors matching the design
  // Owner: yellow (#FFD600), online members: teal (#7EB5A6), offline: gray (#4D4D4D)
  const dotColor = isOwner
    ? 'bg-accent-primary ring-1 ring-inset ring-border-strong'
    : isOffline
      ? 'bg-[#4D4D4D] ring-1 ring-inset ring-[#A8A29E]'
      : 'bg-[#7EB5A6] ring-1 ring-inset ring-[#5A9A8A]'

  const textColor = isOwner
    ? 'text-text-primary font-medium'
    : isOffline
      ? 'text-[#4D4D4D]'
      : 'text-text-secondary'

  const label = isOwner
    ? `${member.actorId} (owner)`
    : member.actorId

  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
      <span className={`text-[13px] ${textColor}`}>{label}</span>
    </div>
  )
}

/* ── Recipe Table ── */

function RecipeTable({ recipes }: { recipes: readonly RecipeSummary[] }) {
  if (recipes.length === 0) {
    return (
      <div className="border border-border-strong bg-bg-surface">
        <div className="empty-state">No recipes match the current filter.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden border border-border-strong bg-bg-surface">
      {/* Table header */}
      <div className="flex items-center border-b border-border-strong bg-[#FAF8F4] px-4 py-3">
        <span className="w-[320px] text-[12px] font-bold text-text-secondary">Name</span>
        <span className="w-[100px] text-[12px] font-bold text-text-secondary">Status</span>
        <span className="w-[120px] text-[12px] font-bold text-text-secondary">Owner</span>
        <span className="w-[140px] text-[12px] font-bold text-text-secondary">Last Updated</span>
        <span className="text-[12px] font-bold text-text-secondary">Actions</span>
      </div>

      {/* Rows */}
      {recipes.map((summary, index) => (
        <RecipeRow
          key={summary.recipe.id}
          summary={summary}
          isLast={index === recipes.length - 1}
        />
      ))}
    </div>
  )
}

function RecipeRow({
  summary,
  isLast,
}: {
  summary: RecipeSummary
  isLast: boolean
}) {
  const bundleLink = summary.activeBundle
    ? `/recipes/${summary.recipe.id}?bundle=${summary.activeBundle.id}`
    : `/recipes/${summary.recipe.id}`

  const status = recipeStatus(summary)

  return (
    <div
      className={`flex items-center px-4 py-3.5 ${
        isLast ? '' : 'border-b border-border-strong'
      }`}
    >
      {/* Name column */}
      <div className="flex w-[320px] flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-text-primary">
          {summary.recipe.name}
        </span>
        <span className="text-[12px] text-text-secondary">
          {summary.recipe.repoUrl}
        </span>
      </div>

      {/* Status column */}
      <div className="w-[100px]">
        <RecipeStatusBadge status={status} />
      </div>

      {/* Owner column */}
      <span className="w-[120px] text-[13px] text-text-secondary">
        {summary.owners[0] ?? summary.recipe.createdBy}
      </span>

      {/* Last Updated column */}
      <span className="w-[140px] text-[13px] text-text-secondary">
        {summary.latestDigest
          ? formatRelativeTime(summary.latestDigest.submittedAt)
          : formatRelativeTime(summary.recipe.createdAt)}
      </span>

      {/* Actions column */}
      <Link href={bundleLink} className="button-base button-secondary">
        <FolderOpen size={16} className="text-[#9B8ACB]" />
        Open
      </Link>
    </div>
  )
}

/* ── Helpers ── */

type RecipeStatusLabel = 'active' | 'draft' | 'archived'

function recipeStatus(summary: RecipeSummary): RecipeStatusLabel {
  if (summary.activeBundleCount > 0) {
    return 'active'
  }
  if (summary.latestDigest) {
    return 'archived'
  }
  return 'draft'
}

function RecipeStatusBadge({ status }: { status: RecipeStatusLabel }) {
  const styles: Record<RecipeStatusLabel, string> = {
    active: 'bg-[#7EB5A6] text-white ring-[#5A9A8A]',
    draft: 'bg-accent-primary text-[#5C4A1F] ring-border-strong',
    archived: 'bg-[#9B8ACB] text-white ring-[#7A6AAB]',
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-[2px] text-[12px] font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  )
}
