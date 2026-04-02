import { Bot, Package, X } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { agentTone, humanAvatarTone, initials, readAgentActivity } from './helpers'
import { joinClasses, WorkspaceBadge } from './shared'
import type { WorkspaceLeftPaneProps } from './types'
import type { WorkspaceTone } from './types'

const BUNDLE_TONE: Record<string, { label: string; tone: WorkspaceTone }> = {
  open: { label: 'open', tone: 'slate' },
  claimed: { label: 'active', tone: 'violet' },
  cooked: { label: 'cooked', tone: 'emerald' },
  blocked: { label: 'blocked', tone: 'amber' },
  cancelled: { label: 'cancelled', tone: 'rose' },
  digested: { label: 'done', tone: 'emerald' },
  rejected: { label: 'rejected', tone: 'rose' },
}

export function WorkspaceLeftPane({
  bundles,
  capabilityRows,
  data,
  mobile = false,
  onSelectBundle,
  onCancelBundle,
  participantCount,
  selectedBundleId,
  testId,
}: WorkspaceLeftPaneProps) {
  return (
    <aside
      data-testid={testId}
      className={joinClasses(
        'flex h-full flex-col overflow-y-auto bg-[#FFFEF5]',
        mobile ? 'border-b border-[#2D2A20]' : ''
      )}
    >
      <section className="border-b border-[#2D2A20] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Workspace
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-[#2D2A20]">
          {data.recipe.name}
        </h2>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full bg-[#10B981]" />
          <p className="text-[11px] font-medium text-[#57534E]">
            Active session · {participantCount} participants
          </p>
        </div>
      </section>

      <section className="border-b border-[#2D2A20] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Humans
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {data.members.map((member, index) => {
            const avatar = humanAvatarTone(index)

            return (
              <div key={member.id} className="flex items-center gap-2.5">
                <div
                  className={joinClasses(
                    'flex h-7 w-7 items-center justify-center rounded-full border border-[#2D2A20] text-[12px] font-semibold',
                    avatar.className
                  )}
                >
                  {initials(member.actorId)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#2D2A20]">
                    {member.actorId}
                    {member.role === 'owner' ? ' (owner)' : ''}
                  </p>
                  <p className="truncate text-[11px] text-[#57534E]">
                    {member.role} · joined {formatRelativeTime(member.joinedAt)}
                  </p>
                </div>

                <span className="h-[7px] w-[7px] rounded-full bg-[#10B981]" />
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-b border-[#2D2A20] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Agents
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {data.agents.map((agent) => {
            const tone = agentTone(agent.status)
            const activeLabel = readAgentActivity(agent)

            return (
              <div key={agent.agentId} className="flex items-center gap-2.5">
                <div
                  className={joinClasses(
                    'flex h-7 w-7 items-center justify-center rounded-full border border-[#2D2A20]',
                    tone.avatarClassName
                  )}
                >
                  <Bot size={14} className={tone.iconClassName} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#2D2A20]">
                    {agent.displayName}
                  </p>
                  <p className={joinClasses('truncate text-[11px]', tone.copyClassName)}>
                    {activeLabel}
                  </p>
                </div>

                {agent.status === 'busy' ? (
                  <WorkspaceBadge label="running" tone="violet" />
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-b border-[#2D2A20] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
            Bundles
          </p>
          <span className="text-[11px] font-semibold text-[#57534E]">
            {bundles.filter((b) => !['cancelled', 'digested', 'rejected'].includes(b.status)).length} active
          </span>
        </div>
        <div className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {bundles.map((bundle) => {
            const tone = BUNDLE_TONE[bundle.status] ?? { label: bundle.status, tone: 'default' as const }
            const isSelected = bundle.id === selectedBundleId
            const isTerminal = ['cancelled', 'digested', 'rejected'].includes(bundle.status)

            return (
              <div
                key={bundle.id}
                className={joinClasses(
                  'flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-[#FEF3C7] border border-[#F59E0B]'
                    : 'hover:bg-[#F5F0E8] border border-transparent'
                )}
                onClick={() => onSelectBundle(bundle.id)}
              >
                <Package size={14} className={isTerminal ? 'text-[#A8A29E]' : 'text-[#57534E]'} />
                <div className="min-w-0 flex-1">
                  <p className={joinClasses(
                    'truncate text-[12px] font-medium',
                    isTerminal ? 'text-[#A8A29E]' : 'text-[#2D2A20]'
                  )}>
                    {bundle.prompt.slice(0, 40)}
                  </p>
                </div>
                <WorkspaceBadge label={tone.label} tone={tone.tone} />
                {!isTerminal && bundle.status !== 'digested' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancelBundle(bundle.id)
                    }}
                    className="text-[#A8A29E] hover:text-[#EF4444] transition-colors"
                    title="Cancel bundle"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            )
          })}
          {bundles.length === 0 ? (
            <p className="text-[12px] text-[#57534E]">No bundles yet.</p>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Capabilities
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {capabilityRows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <row.icon size={14} className="text-[#57534E]" />
              <span className="text-[13px] font-medium text-[#2D2A20]">
                {row.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}
