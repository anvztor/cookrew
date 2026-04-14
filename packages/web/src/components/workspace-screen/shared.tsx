import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { WorkspaceTone } from './types'

export function buttonClassName(
  tone: 'primary' | 'secondary',
  size: 'md' | 'sm' = 'md'
): string {
  return joinClasses(
    'inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#2D2A20] font-medium shadow-[4px_4px_0_#282623] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#282623] disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none',
    tone === 'primary'
      ? 'bg-[#FFD600] text-[#5C4A1F]'
      : 'bg-[#FFFEF5] text-[#5C4A1F]',
    size === 'sm' ? 'px-4 py-[10px] text-[13px]' : 'px-4 py-[10px] text-[14px]'
  )
}

export function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ')
}

export function EmptyWorkspaceState({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <div className="border border-dashed border-[#2D2A20] bg-[#FFFEF5] px-5 py-6 text-sm text-[#57534E]">
      {children}
    </div>
  )
}

export function WorkspaceBadge({
  label,
  tone,
}: {
  readonly label: string
  readonly tone: WorkspaceTone
}) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center rounded-[6px] border px-2 py-[2px] text-[12px] font-medium capitalize',
        toneClassName(tone)
      )}
    >
      {label}
    </span>
  )
}

export function WorkspaceEventBadge({
  icon: Icon,
  label,
  tone,
}: {
  readonly icon: LucideIcon
  readonly label: string
  readonly tone: WorkspaceTone
}) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center gap-1 rounded-[6px] border px-2 py-[2px] text-[10px] font-semibold',
        toneClassName(tone)
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  )
}

export function DependencyTag({
  label,
  tone,
}: {
  readonly label: string
  readonly tone: 'emerald' | 'violet' | 'slate'
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
      : tone === 'violet'
        ? 'border-[#9333EA] bg-[#F3E8FF] text-[#9333EA]'
        : 'border-[#A8A29E] bg-[#FAF8F4] text-[#A8A29E]'

  return (
    <span
      className={joinClasses(
        'inline-flex max-w-[112px] items-center rounded-[4px] border px-2 py-[3px] font-mono text-[11px] font-medium',
        toneClasses
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}

export function DigestRow({
  label,
  value,
}: {
  readonly label: string
  readonly value: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[12px] font-medium text-[#57534E]">
        {label}
      </span>
      {value}
    </div>
  )
}

function toneClassName(tone: WorkspaceTone): string {
  switch (tone) {
    case 'default':
      return 'border-[#2D2A20] bg-[#FFD600] text-[#5C4A1F]'
    case 'emerald':
      return 'border-[#5A9A8A] bg-[#7EB5A6] text-white'
    case 'violet':
      return 'border-[#7A6AAB] bg-[#9B8ACB] text-white'
    case 'slate':
      return 'border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]'
    case 'amber':
      return 'border-[#D97706] bg-[#FFFBEB] text-[#D97706]'
    case 'blue':
      return 'border-[#3B82F6] bg-[#DBEAFE] text-[#3B82F6]'
    case 'rose':
      return 'border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]'
  }
}
