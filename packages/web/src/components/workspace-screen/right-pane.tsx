import Link from 'next/link'
import { ArrowRight, Eye, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { formatRelativeTime } from '@cookrew/shared'
import { GraphMermaidView } from './graph-mermaid-view'
import { getTaskPresentation } from './helpers'
import {
  buttonClassName,
  DependencyTag,
  DigestRow,
  joinClasses,
  WorkspaceBadge,
} from './shared'
import type { WorkspaceRightPaneProps } from './types'

export function WorkspaceRightPane({
  allDependencies,
  artifactCount,
  blockedTaskCount,
  canRerun,
  bundleSequence,
  completedTaskCount,
  isRerunning,
  mobile = false,
  onRerunAction,
  reviewHref,
  selectedBundle,
  visibleDependencies,
  visibleTasks,
  warningCount,
  testId,
}: WorkspaceRightPaneProps) {
  const taskCount = selectedBundle?.tasks.length ?? 0
  const digestSubmittedAt =
    selectedBundle?.digest?.submitted_at ?? selectedBundle?.bundle.digested_at ?? null
  const digestBadge = selectedBundle?.digest
    ? { label: 'complete', tone: 'emerald' as const }
    : selectedBundle?.bundle.status === 'blocked'
      ? { label: 'blocked', tone: 'amber' as const }
      : { label: 'pending', tone: 'slate' as const }

  // Mermaid diagram + currently-running graph node, derived from the
  // bundle's attached graph code and the first in-flight task.
  const graphMermaid = selectedBundle?.bundle.graph_mermaid ?? null
  const runningGraphNodeId = useMemo(() => {
    if (selectedBundle == null) return null
    const inFlight = selectedBundle.tasks.find(
      (t) => t.status === 'working' || t.status === 'claimed',
    )
    return inFlight?.graph_node_id ?? null
  }, [selectedBundle])

  return (
    <aside
      data-testid={testId}
      className={joinClasses(
        'flex h-full flex-col overflow-y-auto bg-[#FFFEF5]',
        mobile ? '' : ''
      )}
    >
      <section className="border-b border-[#2D2A20] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Active Bundle
        </p>
        <h3 className="mt-1 truncate text-[15px] font-semibold text-[#2D2A20]">
          {selectedBundle?.bundle.id ?? 'No active bundle'}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#57534E]">
          <span>{`v${bundleSequence}.0`}</span>
          <span>·</span>
          <span>{`owner: ${selectedBundle?.bundle.created_by ?? 'n/a'}`}</span>
        </div>
      </section>

      {graphMermaid && (
        <section className="border-b border-[#2D2A20] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
              Workflow Graph
            </p>
            {runningGraphNodeId && (
              <span className="text-[11px] font-semibold text-[#059669]">
                running: {runningGraphNodeId}
              </span>
            )}
          </div>
          <div className="mt-3">
            <GraphMermaidView
              code={graphMermaid}
              highlightedNodeId={runningGraphNodeId}
            />
          </div>
        </section>
      )}

      <section className="border-b border-[#2D2A20] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
            Tasks
          </p>
          <span className="text-[11px] font-semibold text-[#059669]">
            {taskCount === 0 ? 'No tasks' : `${completedTaskCount}/${taskCount} complete`}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {selectedBundle ? (
            visibleTasks.length > 0 ? (
              visibleTasks.map((task) => {
                const presentation = getTaskPresentation(task.status)

                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <presentation.icon
                      size={16}
                      className={joinClasses(
                        presentation.iconClassName,
                        task.status === 'working' ? 'animate-spin' : ''
                      )}
                    />
                    <span
                      className={joinClasses(
                        'min-w-0 flex-1 truncate text-[13px] font-medium',
                        presentation.copyClassName
                      )}
                    >
                      {task.title}
                    </span>
                    <WorkspaceBadge
                      label={presentation.badgeLabel}
                      tone={presentation.badgeTone}
                    />
                  </div>
                )
              })
            ) : (
              <p className="text-[12px] text-[#57534E]">
                No tasks match the current workspace search.
              </p>
            )
          ) : (
            <p className="text-[12px] text-[#57534E]">
              The active bundle details will appear here.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-[#2D2A20] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Dependencies
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {visibleDependencies.length > 0 ? (
            visibleDependencies.map((dependency) => (
              <div
                key={`${dependency.from.id}-${dependency.to.id}`}
                className="flex items-center gap-1.5"
              >
                <DependencyTag label={dependency.from.title} tone="emerald" />
                <ArrowRight size={14} className="text-[#57534E]" />
                <DependencyTag
                  label={dependency.to.title}
                  tone={dependency.status === 'resolved' ? 'violet' : 'slate'}
                />
                <WorkspaceBadge
                  label={dependency.status}
                  tone={dependency.status === 'resolved' ? 'emerald' : 'default'}
                />
              </div>
            ))
          ) : selectedBundle ? (
            <p className="text-[12px] text-[#57534E]">
              {allDependencies.length === 0
                ? 'This bundle has no dependency edges yet.'
                : 'No dependency edges match the current search.'}
            </p>
          ) : (
            <p className="text-[12px] text-[#57534E]">
              Dependencies appear after a bundle is selected.
            </p>
          )}
        </div>
      </section>

      <section className="px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534E]">
          Digest State
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2 border border-[#2D2A20] bg-[#FFFBEB] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-[#2D2A20]">
                Last Digest
              </p>
              <span className="text-[11px] text-[#57534E]">
                {digestSubmittedAt ? formatRelativeTime(digestSubmittedAt) : 'Not submitted'}
              </span>
            </div>

            <DigestRow
              label="Status"
              value={
                <WorkspaceBadge
                  label={digestBadge.label}
                  tone={digestBadge.tone}
                />
              }
            />
            <DigestRow
              label="Tasks run"
              value={
                <span className="text-[12px] font-semibold text-[#2D2A20]">
                  {taskCount === 0 ? '0 of 0' : `${completedTaskCount} of ${taskCount}`}
                </span>
              }
            />
            <DigestRow
              label="Artifacts"
              value={
                <span className="text-[12px] font-semibold text-[#2D2A20]">
                  {`${artifactCount} file${artifactCount === 1 ? '' : 's'} written`}
                </span>
              }
            />
            <DigestRow
              label="Warnings"
              value={
                <span
                  className={joinClasses(
                    'text-[12px] font-semibold',
                    warningCount > 0 ? 'text-[#D97706]' : 'text-[#2D2A20]'
                  )}
                >
                  {warningCount > 0
                    ? `${warningCount} pending issue${warningCount === 1 ? '' : 's'}`
                    : 'None'}
                </span>
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-[#57534E]">
              {reviewHref
                ? 'Trace refs and code refs are available anytime'
                : 'Select a bundle to inspect its trace'}
            </span>

            <div className="flex items-center gap-2">
              {canRerun ? (
                <button
                  type="button"
                  aria-label="Re-Run"
                  onClick={onRerunAction}
                  disabled={isRerunning}
                  className={buttonClassName('secondary', 'sm')}
                >
                  <RotateCcw size={16} className="text-[#9B8ACB]" />
                  {isRerunning ? 'Re-Running…' : 'Re-Run'}
                </button>
              ) : null}

              {reviewHref ? (
                <Link
                  aria-label="Review"
                  href={reviewHref}
                  className={buttonClassName('secondary', 'sm')}
                >
                  <Eye size={16} className="text-[#9B8ACB]" />
                  Review
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label="Review"
                  disabled
                  className={buttonClassName('secondary', 'sm')}
                >
                  <Eye size={16} className="text-[#9B8ACB]" />
                  Review
                </button>
              )}
            </div>
          </div>

          {blockedTaskCount > 0 ? (
            <p className="text-[11px] font-medium text-[#D97706]">
              {blockedTaskCount} blocked task{blockedTaskCount === 1 ? '' : 's'} can be reopened
              for reassignment.
            </p>
          ) : canRerun ? (
            <p className="text-[11px] font-medium text-[#D97706]">
              Bundle is blocked — Re-Run retries the graph from the top.
            </p>
          ) : null}
        </div>
      </section>
    </aside>
  )
}
