'use client'

import { Heart } from 'lucide-react'
import { useWorkspace } from '@/store/workspace-store'
import type { Bundle, BundleTask, BundleTaskTone } from '@/types'

function taskSwatch(tone: BundleTaskTone): string {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-600'
    case 'amber':
      return 'bg-amber-500'
    case 'blue':
      return 'bg-blue-500'
    case 'slate':
      return 'bg-stone-400'
  }
}

function TaskRow({ task }: { readonly task: BundleTask }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-3 w-3 border border-[#2A2A2A] ${taskSwatch(task.tone)}`}
      />
      <span className="text-[11px] text-stone-800 leading-tight">
        {task.label}
      </span>
    </div>
  )
}

function WorkflowGraph({ bundle }: { readonly bundle: Bundle }) {
  if (!bundle.workflow) return null
  const nodeMap = new Map(bundle.workflow.nodes.map((node) => [node.id, node.label]))

  return (
    <div className="relative mx-auto h-[196px] w-full max-w-[286px] border border-stone-200 bg-white">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 286 196"
      >
        <line x1="143" y1="32" x2="143" y2="46" stroke="#A8A29E" strokeWidth="1" />
        <line x1="124" y1="80" x2="106" y2="98" stroke="#A8A29E" strokeWidth="1" />
        <line x1="162" y1="80" x2="184" y2="98" stroke="#A8A29E" strokeWidth="1" />
        <line x1="106" y1="114" x2="140" y2="140" stroke="#A8A29E" strokeWidth="1" />
        <line x1="180" y1="114" x2="146" y2="140" stroke="#A8A29E" strokeWidth="1" />
        <line x1="143" y1="174" x2="143" y2="176" stroke="#A8A29E" strokeWidth="1" />
      </svg>

      <div className="absolute left-[132px] top-[10px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-emerald-700 bg-emerald-500 text-[10px] font-bold text-white">
        {nodeMap.get('S')}
      </div>

      <div className="absolute left-[100px] top-[46px] flex h-[34px] w-[86px] items-center justify-center border border-black bg-emerald-50 text-[10px] font-bold text-emerald-900">
        {nodeMap.get('A')}
      </div>

      <div className="absolute left-[34px] top-[98px] flex h-8 w-[72px] items-center justify-center border border-amber-400 bg-amber-50 text-[10px] font-bold text-black">
        {nodeMap.get('B')}
      </div>

      <div className="absolute left-[180px] top-[98px] flex h-8 w-[72px] items-center justify-center border border-black bg-emerald-50 text-[10px] font-bold text-emerald-900">
        {nodeMap.get('C')}
      </div>

      <div className="absolute left-[117px] top-[140px] flex h-[34px] w-[52px] items-center justify-center border border-stone-300 bg-stone-100 text-[10px] font-bold text-stone-700">
        {nodeMap.get('D')}
      </div>

      <div className="absolute left-[132px] top-[176px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-emerald-700 bg-emerald-500 text-[10px] font-bold text-white">
        {nodeMap.get('E')}
      </div>
    </div>
  )
}

function BundleCard({
  bundle,
  isSelected,
  onSelect,
}: {
  readonly bundle: Bundle
  readonly isSelected: boolean
  readonly onSelect: () => void
}) {
  const isExpanded = isSelected && Boolean(bundle.workflow)
  const cardClass = isSelected
    ? 'border-stone-300 bg-bg-muted'
    : bundle.id === 'bundle-c'
      ? 'border-[#2A2A2A] bg-gradient-to-b from-stone-100 to-[#E3DFDC] shadow-[0_8px_18px_#00000010]'
      : 'border-[#3D3D3D] bg-gradient-to-b from-stone-50 to-stone-100 shadow-[0_6px_14px_#00000010]'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      style={{ opacity: isSelected ? 1 : bundle.opacity }}
      className={`
        flex w-full flex-col border px-3 py-2.5 text-left transition-all duration-150
        ${cardClass}
        ${isExpanded ? 'gap-[9px]' : 'gap-[7px]'}
      `}
    >
      <span
        className={`text-[10px] font-medium leading-tight ${
          isSelected
            ? 'font-semibold text-accent-primary'
            : 'font-medium text-[#4D4D4D]'
        }`}
      >
        {bundle.title}
      </span>

      <div className="flex flex-col gap-1.5">
        {bundle.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>

      {isExpanded ? (
        <div className="bg-bg-muted">
          <WorkflowGraph bundle={bundle} />
        </div>
      ) : (
        <span className="text-[10px] leading-[1.4] text-[#6B6B6B]">
          {bundle.taskCount} tasks &bull; {bundle.sponsorCount} sponsors
        </span>
      )}
    </button>
  )
}

export function Timeline() {
  const { bundles, selectedBundleId, selectBundle } = useWorkspace()

  return (
    <div className="flex flex-col gap-2.5 p-3.5 h-full">
      <div className="flex items-center justify-between pb-0.5">
        <h3 className="text-[15px] font-bold text-stone-800">
          Bundle Timeline
        </h3>
        <span
          className="border border-border-strong bg-accent-primary
            px-2 py-0.5 text-[12px] font-medium text-[#5C4A1F]"
        >
          Selected: {bundles.find((b) => b.id === selectedBundleId)?.title}
        </span>
      </div>

      <p className="text-[11px] text-text-secondary leading-[1.45]">
        Encouragers and rewards are bound to bundles. Pick one bundle stack to
        inspect graph and sponsors.
      </p>

      {/* Bundle stack */}
      <div className="flex flex-col gap-1.5">
        {bundles.map((bundle, i) => (
          <div key={bundle.id}>
            <BundleCard
              bundle={bundle}
              isSelected={bundle.id === selectedBundleId}
              onSelect={() => selectBundle(bundle.id)}
            />
            {i < bundles.length - 1 && (
              <div className="h-px bg-border-subtle opacity-70 my-1.5" />
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-secondary font-medium leading-[1.45]">
        Click a bundle title to jump to related chat history in the middle panel.
      </p>

      <div className="flex-1" />

      <button
        type="button"
        className="action-button"
      >
        <Heart size={16} className="text-accent-secondary" />
        Sponsor Active Bundle
      </button>
    </div>
  )
}
