import type {
  AgentStatus,
  BundleStatus,
  DigestDecision,
  EventType,
  TaskStatus,
} from '@/types'

const relativeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDateOnly(value: string | null): string {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatRelativeTime(value: string | null): string {
  if (!value) {
    return 'No activity yet'
  }

  const diffMs = new Date(value).getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return relativeFormatter.format(diffDays, 'day')
}

export function formatStatusLabel(
  value: BundleStatus | TaskStatus | DigestDecision | AgentStatus | EventType | string
): string {
  return value.replaceAll('_', ' ')
}

export function truncateText(value: string, maxLength = 88): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

export function bundleTone(status: BundleStatus): string {
  switch (status) {
    case 'open':
      return 'slate'
    case 'claimed':
      return 'blue'
    case 'cooked':
      return 'amber'
    case 'blocked':
      return 'rose'
    case 'cancelled':
      return 'slate'
    case 'digested':
      return 'emerald'
    case 'rejected':
      return 'rose'
  }
}

export function decisionTone(decision: DigestDecision): string {
  switch (decision) {
    case 'pending':
      return 'amber'
    case 'approved':
      return 'emerald'
    case 'rejected':
      return 'rose'
  }
}

export function calculateMedian(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  }

  return sorted[middle]
}
