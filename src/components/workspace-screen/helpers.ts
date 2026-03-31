import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  CheckCircle2,
  Circle,
  CircleAlert,
  ClipboardCheck,
  FileText,
  GitBranch,
  LoaderCircle,
  Scale,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import type { AgentPresence, BundleWithDetails, Event, Task, TaskStatus } from '@/types'
import type {
  CapabilityRow,
  DependencyRow,
  EventPresentation,
  AgentTonePresentation,
  HumanAvatarTone,
  TaskPresentation,
} from './types'

export function matchesQuery(query: string, values: readonly string[]): boolean {
  return values.some((value) => value.toLowerCase().includes(query))
}

export function initials(value: string): string {
  const parts = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return value.slice(0, 1).toUpperCase()
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function humanAvatarTone(index: number): HumanAvatarTone {
  const tones = [
    'bg-[#FFD600] text-[#5C4A1F]',
    'bg-[#DBEAFE] text-[#1E40AF]',
    'bg-[#ECFDF5] text-[#065F46]',
    'bg-[#FEE2E2] text-[#991B1B]',
  ]

  return {
    className: tones[index % tones.length],
  }
}

export function agentTone(status: AgentPresence['status']): AgentTonePresentation {
  switch (status) {
    case 'busy':
      return {
        avatarClassName: 'bg-[#F3E8FF]',
        iconClassName: 'text-[#9333EA]',
        copyClassName: 'text-[#9333EA] font-medium',
      }
    case 'online':
      return {
        avatarClassName: 'bg-[#ECFDF5]',
        iconClassName: 'text-[#059669]',
        copyClassName: 'text-[#57534E]',
      }
    case 'offline':
      return {
        avatarClassName: 'bg-[#F3F4F6]',
        iconClassName: 'text-[#6B7280]',
        copyClassName: 'text-[#A8A29E]',
      }
  }
}

export function readAgentActivity(agent: AgentPresence): string {
  if (agent.status === 'busy') {
    return agent.currentTaskId
      ? `working on ${agent.currentTaskId}`
      : 'working on active task'
  }

  if (agent.status === 'online') {
    return 'idle — awaiting task'
  }

  return `last heartbeat ${formatRelativeTime(agent.lastHeartbeatAt)}`
}

export function getCapabilityRows(
  agents: readonly AgentPresence[]
): CapabilityRow[] {
  const seen = new Set<string>()
  const rows: CapabilityRow[] = []

  for (const capability of agents.flatMap((agent) => agent.capabilities)) {
    if (seen.has(capability)) {
      continue
    }

    seen.add(capability)
    rows.push({
      label: formatCapabilityLabel(capability),
      icon: capabilityIcon(capability),
    })

    if (rows.length === 5) {
      break
    }
  }

  if (rows.length > 0) {
    return rows
  }

  return [
    { label: 'Bundle authoring', icon: FileText },
    { label: 'Dependency resolution', icon: GitBranch },
    { label: 'Digest generation', icon: Sparkles },
    { label: 'Evidence review', icon: Scale },
    { label: 'Task orchestration', icon: ClipboardCheck },
  ]
}

export function getTaskPresentation(status: TaskStatus): TaskPresentation {
  switch (status) {
    case 'done':
      return {
        badgeLabel: 'done',
        badgeTone: 'emerald',
        copyClassName: 'text-[#2D2A20]',
        icon: CheckCircle2,
        iconClassName: 'text-[#059669]',
      }
    case 'working':
      return {
        badgeLabel: 'running',
        badgeTone: 'violet',
        copyClassName: 'text-[#2D2A20]',
        icon: LoaderCircle,
        iconClassName: 'text-[#9333EA]',
      }
    case 'claimed':
      return {
        badgeLabel: 'claimed',
        badgeTone: 'blue',
        copyClassName: 'text-[#2D2A20]',
        icon: Bot,
        iconClassName: 'text-[#3B82F6]',
      }
    case 'blocked':
      return {
        badgeLabel: 'blocked',
        badgeTone: 'amber',
        copyClassName: 'text-[#D97706]',
        icon: CircleAlert,
        iconClassName: 'text-[#D97706]',
      }
    case 'cancelled':
      return {
        badgeLabel: 'cancelled',
        badgeTone: 'slate',
        copyClassName: 'text-[#A8A29E]',
        icon: Circle,
        iconClassName: 'text-[#A8A29E]',
      }
    case 'open':
      return {
        badgeLabel: 'queued',
        badgeTone: 'slate',
        copyClassName: 'text-[#A8A29E]',
        icon: Circle,
        iconClassName: 'text-[#A8A29E]',
      }
  }
}

export function getEventPresentation(event: Event): EventPresentation {
  if (event.type === 'prompt' && event.actorType === 'human') {
    return {
      label: 'human:prompt',
      tone: 'blue',
      icon: UserRound,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'task_claimed') {
    return {
      label: 'task:claimed',
      tone: 'slate',
      icon: Bot,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'milestone' && event.actorType === 'agent') {
    return {
      label: 'agent:output',
      tone: 'violet',
      icon: Bot,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'fact_added') {
    return {
      label: 'fact:added',
      tone: 'amber',
      icon: FileText,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'code_pushed') {
    return {
      label: 'code:pushed',
      tone: 'blue',
      icon: GitBranch,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'digest_submitted') {
    return {
      label: 'digest:submit',
      tone: 'amber',
      icon: Sparkles,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'digest_approved') {
    return {
      label: 'digest:approved',
      tone: 'emerald',
      icon: CheckCircle2,
      bodyClassName: 'text-[#57534E]',
    }
  }

  if (event.type === 'digest_rejected') {
    return {
      label: 'digest:rejected',
      tone: 'rose',
      icon: CircleAlert,
      bodyClassName: 'text-[#B91C1C]',
    }
  }

  if (event.actorType === 'system') {
    return {
      label: 'system:plan',
      tone: 'amber',
      icon: Sparkles,
      bodyClassName: 'text-[#57534E]',
    }
  }

  return {
    label: `${event.actorType}:${event.type.replaceAll('_', '-')}`,
    tone: 'blue',
    icon: Sparkles,
    bodyClassName: 'text-[#57534E]',
  }
}

export function buildDependencyRows(tasks: readonly Task[]): DependencyRow[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const dependencies: DependencyRow[] = []

  for (const task of tasks) {
    for (const dependencyId of task.dependsOnTaskIds) {
      const dependencyTask = taskMap.get(dependencyId)
      if (!dependencyTask) {
        continue
      }

      dependencies.push({
        from: dependencyTask,
        to: task,
        status: dependencyTask.status === 'done' ? 'resolved' : 'pending',
      })
    }
  }

  return dependencies
}

export function countArtifactPaths(
  selectedBundle: BundleWithDetails | null
): number {
  if (!selectedBundle) {
    return 0
  }

  const digestPathCount =
    selectedBundle.digest?.codeRefs.reduce(
      (count, codeRef) => count + codeRef.paths.length,
      0
    ) ?? 0

  if (digestPathCount > 0) {
    return digestPathCount
  }

  return selectedBundle.events.reduce(
    (count, event) =>
      count +
      event.codeRefs.reduce(
        (eventCount, codeRef) => eventCount + codeRef.paths.length,
        0
      ),
    0
  )
}

export function pickTargetAgent(
  agents: readonly AgentPresence[],
  selectedBundle: BundleWithDetails | null
): AgentPresence | null {
  const activeTask =
    selectedBundle?.tasks.find((task) => task.status === 'working') ??
    selectedBundle?.tasks.find((task) => task.status === 'claimed') ??
    null

  if (activeTask?.claimedByAgentId) {
    const matchingAgent = agents.find(
      (agent) => agent.agentId === activeTask.claimedByAgentId
    )
    if (matchingAgent) {
      return matchingAgent
    }
  }

  return agents.find((agent) => agent.status === 'busy') ?? agents[0] ?? null
}

function formatCapabilityLabel(capability: string): string {
  switch (capability) {
    case 'planning':
      return 'Bundle planning'
    case 'routing':
      return 'Route orchestration'
    case 'review':
      return 'Digest review'
    case 'digest':
      return 'Digest generation'
    case 'research':
      return 'Evidence gathering'
    case 'facts':
      return 'Fact capture'
    case 'nextjs':
      return 'Next.js delivery'
    case 'typescript':
      return 'TypeScript implementation'
    case 'claim':
      return 'Task claiming'
    case 'milestones':
      return 'Milestone updates'
    case 'tests':
      return 'Test automation'
    case 'ci':
      return 'CI verification'
    default:
      return capability.replaceAll('-', ' ')
  }
}

function capabilityIcon(capability: string): LucideIcon {
  switch (capability) {
    case 'planning':
    case 'review':
    case 'claim':
      return ClipboardCheck
    case 'routing':
      return GitBranch
    case 'digest':
    case 'milestones':
      return Sparkles
    case 'research':
    case 'facts':
      return Scale
    case 'tests':
    case 'ci':
      return CheckCircle2
    default:
      return FileText
  }
}
