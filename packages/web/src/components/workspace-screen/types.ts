import type { LucideIcon } from 'lucide-react'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  Event,
  Task,
  WorkspaceData,
} from '@cookrew/shared'
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
  readonly historyHref: string
  readonly onSearchChange: (value: string) => void
  readonly searchValue: string
}

export interface WorkspaceLeftPaneProps {
  readonly bundles: readonly Bundle[]
  readonly capabilityRows: readonly CapabilityRow[]
  readonly data: WorkspaceData
  readonly mobile?: boolean
  readonly onSelectBundle: (bundleId: string) => void
  readonly onCancelBundle: (bundleId: string) => void
  readonly participantCount: number
  readonly selectedBundleId: string | null
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
  readonly recipeId?: string
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
  readonly blockedTaskCount: number
  /**
   * True when Re-Run is a valid action for the selected bundle. This is
   * broader than `blockedTaskCount > 0`: the graph runner can flip the
   * bundle itself to BLOCKED (e.g. "no eligible gateway") before any task
   * row transitions out of `open`, and we still want the user to be
   * able to re-run from the top once they re-onboard agents.
   */
  readonly canRerun: boolean
  readonly bundleSequence: number
  readonly completedTaskCount: number
  readonly isRerunning: boolean
  readonly mobile?: boolean
  readonly onRerunAction: () => void
  readonly reviewHref: string | null
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

export type { AgentTonePresentation, HumanAvatarTone }
