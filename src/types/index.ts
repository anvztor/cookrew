export interface Repo {
  readonly id: string
  readonly name: string
  readonly icon: string
}

export interface Cooker {
  readonly id: string
  readonly emoji: string
  readonly displayName: string
  readonly action: string
}

export type MessageTone = 'primary' | 'secondary'

export interface ChatMessage {
  readonly id: string
  readonly bundleId: string
  readonly bundleTag?: string
  readonly timestamp: string
  readonly emoji: string
  readonly sender: string
  readonly content: string
  readonly tone: MessageTone
}

export type BundleTaskTone = 'slate' | 'amber' | 'blue' | 'emerald'

export interface BundleTask {
  readonly id: string
  readonly label: string
  readonly tone: BundleTaskTone
}

export interface WorkflowNode {
  readonly id: string
  readonly label: string
}

export interface WorkflowEdge {
  readonly from: string
  readonly to: string
}

export interface Bundle {
  readonly id: string
  readonly title: string
  readonly taskCount: number
  readonly sponsorCount: number
  readonly tasks: readonly BundleTask[]
  readonly workflow?: {
    readonly nodes: readonly WorkflowNode[]
    readonly edges: readonly WorkflowEdge[]
  }
  readonly opacity: number
  readonly isActive: boolean
}
