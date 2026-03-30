import {
  agentTone,
  bundleTone,
  decisionTone,
  eventTone,
  formatStatusLabel,
  taskTone,
} from '@/lib/format'
import type {
  AgentStatus,
  BundleStatus,
  DigestDecision,
  EventType,
  TaskStatus,
} from '@/types'

type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' | 'violet'

function ToneBadge({
  label,
  tone,
}: {
  readonly label: string
  readonly tone: Tone
}) {
  return (
    <span className={`status-badge tone-${tone}`}>
      {formatStatusLabel(label)}
    </span>
  )
}

export function BundleStatusBadge({
  status,
}: {
  readonly status: BundleStatus
}) {
  return <ToneBadge label={status} tone={bundleTone(status) as Tone} />
}

export function TaskStatusBadge({ status }: { readonly status: TaskStatus }) {
  return <ToneBadge label={status} tone={taskTone(status) as Tone} />
}

export function DecisionBadge({
  decision,
}: {
  readonly decision: DigestDecision
}) {
  return <ToneBadge label={decision} tone={decisionTone(decision) as Tone} />
}

export function AgentStatusBadge({
  status,
}: {
  readonly status: AgentStatus
}) {
  return <ToneBadge label={status} tone={agentTone(status) as Tone} />
}

export function EventTypeBadge({
  type,
}: {
  readonly type: EventType
}) {
  return <ToneBadge label={type} tone={eventTone(type) as Tone} />
}
