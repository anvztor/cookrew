import type { LucideIcon } from 'lucide-react'
import type {
  AgentPresence,
  BundleWithDetails,
  Event,
  Task,
  TaskStatus,
  WorkspaceData,
} from '@/types'
import type { AgentTonePresentation, HumanAvatarTone } from './internal-types'

export type WorkspaceTone =
  | 'default'
  | 'emerald'
  | 'violet'
  | 'slate'
  | 'amber'
  | 'blue'
  | 'rose'

export interface DependencyRow {
  readonly from: Task
  readonly to: Task
  readonly status: 'resolved' | 'pending'
}

export interface CapabilityRow {
  readonly label: string
  readonly icon: LucideIcon
}

export interface EventPresentation {
  readonly label: string
  readonly tone: WorkspaceTone
  readonly icon: LucideIcon
  readonly bodyClassName: string
}

export interface TaskPresentation {
  readonly badgeLabel: string
  readonly badgeTone: WorkspaceTone
  readonly copyClassName: string
  readonly icon: LucideIcon
  readonly iconClassName: string
}

export interface WorkspaceScreenProps {
  readonly recipeId: string
}

export interface WorkspaceHeaderProps {
  readonly digestHref: string | null
  readonly hasDigest: boolean
  readonly onDigestAction: () => void
  readonly onSearchChange: (value: string) => void
  readonly searchValue: string
}

export interface WorkspaceLeftPaneProps {
  readonly capabilityRows: readonly CapabilityRow[]
  readonly data: WorkspaceData
  readonly mobile?: boolean
  readonly participantCount: number
  readonly testId?: string
}

export interface WorkspaceCenterPaneProps {
  readonly events: readonly Event[]
  readonly hasQuery: boolean
  readonly isSubmitting: boolean
  readonly mobile?: boolean
  readonly onCreateBundle: () => void
  readonly onToggleTaskSeeds: () => void
  readonly prompt: string
  readonly requestedBy: string
  readonly selectedAgent: AgentPresence | null
  readonly selectedBundle: BundleWithDetails | null
  readonly setPrompt: (value: string) => void
  readonly setRequestedBy: (value: string) => void
  readonly setTaskSeedText: (value: string) => void
  readonly showTaskSeeds: boolean
  readonly taskSeedText: string
  readonly testId?: string
}

export interface WorkspaceRightPaneProps {
  readonly allDependencies: readonly DependencyRow[]
  readonly artifactCount: number
  readonly bundleSequence: number
  readonly completedTaskCount: number
  readonly digestHref: string | null
  readonly mobile?: boolean
  readonly onDigestAction: () => void
  readonly selectedBundle: BundleWithDetails | null
  readonly visibleDependencies: readonly DependencyRow[]
  readonly visibleTasks: readonly Task[]
  readonly warningCount: number
  readonly testId?: string
}

export interface ResizeHandleProps {
  readonly ariaLabel: string
  readonly testId: string
}

export interface TaskFilterInput {
  readonly title: string
  readonly status: TaskStatus
  readonly blockedReason: string | null
  readonly dependsOnTaskIds: readonly string[]
}

export type { AgentTonePresentation, HumanAvatarTone }
