import {
  bundleTone,
  decisionTone,
  formatStatusLabel,
} from '@cookrew/shared'
import type {
  BundleStatus,
  DigestDecision,
} from '@cookrew/shared'

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

export function DecisionBadge({
  decision,
}: {
  readonly decision: DigestDecision
}) {
  return <ToneBadge label={decision} tone={decisionTone(decision) as Tone} />
}
