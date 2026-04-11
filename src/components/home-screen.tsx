'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import {
  Coins,
  GitBranch,
  LogOut,
  Search,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { getCookbookData } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { SessionKeyPanel } from '@/components/session-key-panel'
import { MintAgentsPanel } from '@/components/mint-agents-panel'
import type { CookbookData, CookbookGroup } from '@/types'

const CATEGORIES = ['All', 'Frontend', 'Backend', 'DevOps', 'AI/ML', 'Docs', 'Testing'] as const

interface ProjectCard {
  readonly emoji: string
  readonly title: string
  readonly owner: string
  readonly bounty: string
  readonly difficulty: string
  readonly color: string
}

const SAMPLE_PROJECTS: readonly ProjectCard[] = []

export function HomeScreen() {
  const [data, setData] = useState<CookbookData | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const deferredSearch = useDeferredValue(search)
  const { authenticated, loading: authLoading, walletAddress, accountId, login, logout } = useAuth()

  useEffect(() => {
    let isMounted = true
    void getCookbookData().then((d) => {
      if (isMounted) {
        setData(d)
      }
    })
    return () => { isMounted = false }
  }, [])

  // Use real cookbooks if available, otherwise show sample projects
  const cookbooks = data?.cookbooks ?? []

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-strong bg-bg-surface px-6 py-4">
        <span className="text-[20px] font-extrabold tracking-[2px] text-text-primary">
          COOKREW
        </span>

        <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-border-strong bg-white px-3" style={{ width: 400, height: 40 }}>
          <Search size={18} className="text-[#78716C]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-[#A8A29E]"
          />
        </div>

        <div className="flex items-center gap-3">
          {authenticated ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary">
                <User size={16} className="text-text-primary" />
              </div>
              <span className="text-[14px] font-medium text-text-primary">
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : accountId?.slice(0, 12) ?? 'Account'}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#f0ece4] transition-colors"
                title="Sign out"
              >
                <LogOut size={18} className="text-[#78716C]" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={login}
              disabled={authLoading}
              className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-border-strong bg-accent-primary px-4 py-2 text-[14px] font-semibold text-text-primary transition-colors hover:bg-accent-primary-light disabled:opacity-50"
            >
              {authLoading ? 'Loading...' : 'Sign in'}
            </button>
          )}
        </div>
      </header>

      {/* Hero section */}
      <section className="flex flex-col items-center gap-10 bg-[#FAF8F4] px-20 py-14">
        <div className="flex flex-col items-center gap-4">
          <span className="inline-flex items-center rounded-md bg-accent-primary px-2 py-[2px] text-[12px] font-medium text-[#5C4A1F] ring-1 ring-inset ring-border-strong">
            Task Collaboration Platform
          </span>
          <h1 className="text-center text-[40px] font-bold text-text-primary">
            Welcome to Cookrew
          </h1>
          <p className="max-w-[700px] text-center text-[16px] leading-[1.6] text-text-secondary">
            A collaborative workspace where humans orchestrate AI agents on repositories.
            Claim tasks, ship code, and earn bounty.
          </p>
        </div>

        {/* Feature cards */}
        <div className="flex w-full justify-center gap-6">
          <FeatureCard
            icon={<GitBranch size={24} className="text-[#D97706]" />}
            iconBg="bg-[#FFD60025]"
            title="Browse Projects"
            subtitle="Browse Recipes"
            description="Explore community repositories and discover tasks with bounty opportunities."
          />
          <FeatureCard
            icon={<Users size={24} className="text-[#9B8ACB]" />}
            iconBg="bg-[#9B8ACB25]"
            title="Join & Contribute"
            subtitle="Join & Contribute"
            description="Join project teams, claim tasks, and collaborate with AI agents to ship work."
          />
          <FeatureCard
            icon={<Coins size={24} className="text-[#D97706]" />}
            iconBg="bg-[#FFD60025]"
            title="Earn Bounty"
            subtitle="Earn Bounty"
            description="Get rewarded for every completed task and build your contributor reputation."
          />
        </div>
      </section>

      {/* Explore Projects section */}
      <section className="flex flex-1 flex-col gap-6 px-20 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-bold text-text-primary">Explore Projects</h2>
          <p className="text-[14px] text-[#78716C]">Discover projects with bounty, join and contribute</p>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl border border-border-strong px-4 py-2 text-[14px] font-medium text-[#5C4A1F] transition-colors ${
                activeCategory === cat ? 'bg-accent-primary' : 'bg-bg-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Project cards — show real cookbooks if available, else samples */}
        {cookbooks.length > 0 ? (
          <RealProjectGrid cookbooks={cookbooks} search={deferredSearch} />
        ) : (
          <SampleProjectGrid />
        )}
      </section>

      {/* Session key approval panel (floating, bottom-right) */}
      {authenticated && (
        <>
          <SessionKeyPanel smartAccountAddress={walletAddress} />
          <MintAgentsPanel />
        </>
      )}
    </div>
  )
}

/* ── Feature Card ── */

function FeatureCard({
  icon,
  iconBg,
  title,
  subtitle,
  description,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  description: string
}) {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border-strong bg-bg-surface">
      <div className="flex flex-col gap-3.5 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full border border-border-strong ${iconBg}`}>
          {icon}
        </div>
        <p className="text-[18px] font-semibold text-text-primary">{title}</p>
        <p className="text-[13px] font-medium text-[#9B8ACB]">{subtitle}</p>
        <p className="text-[13px] leading-[1.5] text-[#78716C]">{description}</p>
      </div>
    </div>
  )
}

/* ── Real project grid from cookbooks ── */

function RealProjectGrid({
  cookbooks,
  search,
}: {
  cookbooks: readonly CookbookGroup[]
  search: string
}) {
  const filtered = cookbooks.filter((g) => {
    if (search.trim().length === 0) {
      return true
    }
    const q = search.trim().toLowerCase()
    return (
      g.cookbook.name.toLowerCase().includes(q) ||
      g.recipes.some((r) => r.recipe.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="grid grid-cols-4 gap-5">
      {filtered.map((group) => (
        <Link
          key={group.cookbook.id}
          href={`/cookbooks/${group.cookbook.id}`}
          className="flex flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-surface transition-transform hover:translate-y-[-2px]"
        >
          <div
            className="relative flex h-[120px] items-center justify-center"
            style={{ backgroundColor: '#9B8ACB' }}
          >
            <span className="text-[48px]">
              {group.recipes.length > 0 ? '\uD83D\uDCCB' : '\uD83D\uDCC2'}
            </span>
            <span className="absolute left-2 top-2 rounded-lg border-2 border-border-strong bg-bg-surface px-2 py-1 text-[10px] font-medium text-[#5C4A1F]">
              {group.recipes.length} recipe{group.recipes.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <p className="text-[14px] font-bold text-[#5C4A1F]">{group.cookbook.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#5C574D]">@{group.cookbook.ownerId}</span>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D97706]">
                <Coins size={14} className="text-[#D97706]" />
                {group.agents.length} agent{group.agents.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-accent-primary px-4 py-2.5 text-[12px] font-medium text-[#5C4A1F] shadow-[4px_4px_0_#282623]">
              <UserPlus size={14} className="text-[#9B8ACB]" />
              Open
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ── Sample project grid ── */

function SampleProjectGrid() {
  const row1 = SAMPLE_PROJECTS.slice(0, 4)
  const row2 = SAMPLE_PROJECTS.slice(4, 8)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-5">
        {row1.map((p) => <ProjectCardUI key={p.title} project={p} />)}
      </div>
      <div className="grid grid-cols-4 gap-5">
        {row2.map((p) => <ProjectCardUI key={p.title} project={p} />)}
      </div>
    </div>
  )
}

function ProjectCardUI({ project }: { project: ProjectCard }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-surface">
      {/* Thumbnail */}
      <div
        className="relative flex h-[120px] items-center justify-center"
        style={{ backgroundColor: project.color }}
      >
        <span className="text-[48px]">{project.emoji}</span>
        <span className="absolute left-2 top-2 rounded-lg border-2 border-border-strong bg-bg-surface px-2 py-1 text-[10px] font-medium text-[#5C4A1F]">
          {project.difficulty}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <p className="text-[14px] font-bold text-[#5C4A1F]">{project.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#5C574D]">{project.owner}</span>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D97706]">
            <Coins size={14} className="text-[#D97706]" />
            {project.bounty}
          </span>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-accent-primary px-4 py-2.5 text-[12px] font-medium text-[#5C4A1F] shadow-[4px_4px_0_#282623]"
        >
          <UserPlus size={14} className="text-[#9B8ACB]" />
          Join
        </button>
      </div>
    </div>
  )
}
