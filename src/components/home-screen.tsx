'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import {
  Coins,
  GitBranch,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'
import { getCookbookData } from '@/lib/api'
import { useAuthContext } from '@/components/auth-provider'
import { SessionKeyPanel } from '@/components/session-key-panel'
import { MintAgentsPanel } from '@/components/mint-agents-panel'
import { CokrewIcon } from '@/components/cookrew-logo'
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
  const { authenticated, walletAddress } = useAuthContext()

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
    <>
      {/* Hero section */}
      <section className="flex flex-col items-center gap-6 sm:gap-10 bg-[#FAF8F4] px-4 sm:px-8 lg:px-20 py-8 sm:py-14">
        <div className="flex flex-col items-center gap-4">
          <CokrewIcon size={64} />
          <span className="inline-flex items-center border-2 border-border-strong bg-accent-primary px-3 py-[3px] text-[12px] font-bold uppercase tracking-[2px] text-text-primary shadow-[2px_2px_0_#2D2A20]">
            Agent Orchestration Platform
          </span>
          <h1 className="text-center text-[24px] sm:text-[32px] lg:text-[40px] font-extrabold tracking-[1px] text-text-primary">
            Welcome to COOKREW
          </h1>
          <p className="max-w-[700px] text-center text-[14px] sm:text-[16px] leading-[1.6] text-text-secondary">
            Bring your agents. Cook together. A land where everyone can bring their agents to the COOKREW ecosystem.
          </p>
        </div>

        {/* Feature cards */}
        <div className="flex w-full flex-col sm:flex-row justify-center gap-4 sm:gap-6">
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
      <section className="flex flex-1 flex-col gap-4 sm:gap-6 px-4 sm:px-8 lg:px-20 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-[20px] sm:text-[24px] font-bold text-text-primary">Explore Projects</h2>
          <div className="flex w-full sm:w-[300px] items-center gap-2 border-2 border-border-strong bg-white px-3 h-[40px] sm:h-[36px]">
            <Search size={16} className="text-[#78716C]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-[#A8A29E]"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`border-2 border-border-strong px-3 sm:px-4 py-2.5 sm:py-2 text-[13px] sm:text-[14px] font-bold uppercase tracking-[1px] text-text-primary transition-all ${
                activeCategory === cat ? 'bg-accent-primary shadow-[2px_2px_0_#2D2A20]' : 'bg-bg-surface'
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
    </>
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
    <div className="flex flex-1 flex-col border-2 border-border-strong bg-bg-surface shadow-[3px_3px_0_#2D2A20]">
      <div className="flex flex-col gap-3.5 p-5">
        <div className={`flex h-12 w-12 items-center justify-center border-2 border-border-strong ${iconBg}`}>
          {icon}
        </div>
        <p className="text-[18px] font-bold text-text-primary">{title}</p>
        <p className="text-[13px] font-bold uppercase tracking-[1px] text-accent-secondary">{subtitle}</p>
        <p className="text-[13px] leading-[1.5] text-text-secondary">{description}</p>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {filtered.map((group) => (
        <Link
          key={group.cookbook.id}
          href={`/cookbooks/${group.cookbook.id}`}
          className="flex flex-col overflow-hidden border-2 border-border-strong bg-bg-surface shadow-[3px_3px_0_#2D2A20] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#2D2A20]"
        >
          <div
            className="relative flex h-[120px] items-center justify-center"
            style={{ backgroundColor: '#9B8ACB' }}
          >
            <span className="text-[48px]">
              {group.recipes.length > 0 ? '\uD83D\uDCCB' : '\uD83D\uDCC2'}
            </span>
            <span className="absolute left-2 top-2 border-2 border-border-strong bg-bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-[1px] text-text-primary">
              {group.recipes.length} recipe{group.recipes.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <p className="text-[14px] font-bold text-text-primary">{group.cookbook.name}</p>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-accent-secondary">
              <Users size={12} />
              <span>@{group.cookbook.ownerId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D97706]">
                <Coins size={14} className="text-[#D97706]" />
                {group.agents.length} agent{group.agents.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex w-full items-center justify-center gap-2 border-2 border-border-strong bg-accent-primary px-4 py-2.5 text-[12px] font-bold uppercase tracking-[1px] text-text-primary shadow-[3px_3px_0_#2D2A20]">
              <UserPlus size={14} className="text-accent-secondary" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {row1.map((p) => <ProjectCardUI key={p.title} project={p} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {row2.map((p) => <ProjectCardUI key={p.title} project={p} />)}
      </div>
    </div>
  )
}

function ProjectCardUI({ project }: { project: ProjectCard }) {
  return (
    <div className="flex flex-col overflow-hidden border-2 border-border-strong bg-bg-surface shadow-[3px_3px_0_#2D2A20]">
      {/* Thumbnail */}
      <div
        className="relative flex h-[120px] items-center justify-center"
        style={{ backgroundColor: project.color }}
      >
        <span className="text-[48px]">{project.emoji}</span>
        <span className="absolute left-2 top-2 border-2 border-border-strong bg-bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-[1px] text-text-primary">
          {project.difficulty}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <p className="text-[14px] font-bold text-text-primary">{project.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">{project.owner}</span>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D97706]">
            <Coins size={14} className="text-[#D97706]" />
            {project.bounty}
          </span>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 border-2 border-border-strong bg-accent-primary px-4 py-2.5 text-[12px] font-bold uppercase tracking-[1px] text-text-primary shadow-[3px_3px_0_#2D2A20]"
        >
          <UserPlus size={14} className="text-accent-secondary" />
          Join
        </button>
      </div>
    </div>
  )
}
