/**
 * Local types for the WorkflowGraphCard.
 *
 * Kept module-local because they're glue types — the canonical shapes
 * live in @cookrew/shared (Task) and @/hooks/use-task-stream (TaskLiveState).
 * If a third caller appears, promote them.
 */

import type { Task } from '@cookrew/shared'

import type { TaskLiveState } from '@/hooks/use-task-stream'

/**
 * Data passed to each ReactFlow node via `node.data`. Mirrors the inputs
 * a TaskNode needs to render the compact view, plus interaction callbacks.
 *
 * Keep callbacks here — keeping them out (e.g. via context) is cleaner
 * for re-render minimization, but adds wiring overhead Phase 1 doesn't
 * need yet. Revisit if profiler shows node re-renders are expensive.
 */
export interface TaskNodeData {
  readonly task: Task
  readonly liveState: TaskLiveState | null
  readonly onExpand?: (taskId: string) => void
  readonly onCancel?: (taskId: string) => void
  readonly onRerun?: (taskId: string) => void
  /** True when this node is the focused one (e.g. expanded). */
  readonly isExpanded?: boolean
  /** Index for keyboard nav / a11y. */
  readonly [key: string]: unknown
}
