'use client'

/**
 * Memoized dagre layout for a bundle's task DAG.
 *
 * Pure function wrapped in useMemo — given the same task list (by id +
 * deps signature) returns the same node positions, so ReactFlow doesn't
 * jitter on unrelated re-renders (e.g. when a single task's status flips).
 *
 * Layout: top-to-bottom (per design call), with reasonable padding.
 *
 * Edge cases handled here so consumers don't have to:
 *   - Dangling deps (parent missing from task set) are dropped, not
 *     rendered as ghost nodes.
 *   - Cycles: dagre is a DAG layout; if a cycle slips in (shouldn't,
 *     but defensive), dagre throws — we catch and fall back to a
 *     flat row layout so the UI still renders.
 *   - Empty task list returns empty {nodes, edges}.
 */

import { useMemo } from 'react'
import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'

import type { Task } from '@cookrew/shared'

import type { TaskNodeData } from './types'
import type { TaskLiveState } from '@/hooks/use-task-stream'

const NODE_WIDTH = 240
const NODE_HEIGHT = 92
const RANK_DIR = 'TB' as const
const NODE_SEP = 32
const RANK_SEP = 56

interface LayoutInput {
  readonly tasks: readonly Task[]
  readonly liveStates: Readonly<Record<string, TaskLiveState>>
  readonly onExpand?: (taskId: string) => void
  readonly onCancel?: (taskId: string) => void
  readonly onRerun?: (taskId: string) => void
  readonly expandedTaskId?: string | null
}

interface LayoutResult {
  readonly nodes: readonly Node<TaskNodeData>[]
  readonly edges: readonly Edge[]
}

/**
 * Build a stable layout signature from a task list. Captures the
 * structural inputs (task ids, deps, count) but not transient ones
 * (status, agent) so we don't relayout when a status flips.
 */
function structuralSignature(tasks: readonly Task[]): string {
  return tasks
    .map((t) => `${t.id}<-${(t.depends_on_task_ids ?? []).join(',')}`)
    .sort()
    .join('|')
}

export function useGraphLayout({
  tasks,
  liveStates,
  onExpand,
  onCancel,
  onRerun,
  expandedTaskId,
}: LayoutInput): LayoutResult {
  // Step 1: position nodes. Recomputed only when structural signature
  // changes (deps add/remove, tasks add/remove). Status flips don't
  // jitter the canvas.
  const sig = useMemo(() => structuralSignature(tasks), [tasks])

  const positions = useMemo(() => {
    if (tasks.length === 0) return new Map<string, { x: number; y: number }>()

    const taskIds = new Set(tasks.map((t) => t.id))

    try {
      const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
      g.setGraph({ rankdir: RANK_DIR, nodesep: NODE_SEP, ranksep: RANK_SEP })
      for (const t of tasks) g.setNode(t.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
      for (const t of tasks) {
        for (const parent of t.depends_on_task_ids ?? []) {
          if (taskIds.has(parent)) g.setEdge(parent, t.id)
        }
      }
      dagre.layout(g)
      const out = new Map<string, { x: number; y: number }>()
      for (const t of tasks) {
        const p = g.node(t.id)
        out.set(t.id, {
          x: p.x - NODE_WIDTH / 2,
          y: p.y - NODE_HEIGHT / 2,
        })
      }
      return out
    } catch {
      // Cycle or other dagre failure: fall back to a single horizontal row.
      // Better a degraded view than a crashed one.
      const out = new Map<string, { x: number; y: number }>()
      tasks.forEach((t, i) => {
        out.set(t.id, { x: i * (NODE_WIDTH + NODE_SEP), y: 0 })
      })
      return out
    }
    // Layout depends only on the structural signature, not on `tasks`
    // identity. Suppress the lint warning — we accept the trade-off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  // Step 2: assemble ReactFlow nodes/edges. This recomputes when live
  // state changes, but it's just object construction — cheap.
  return useMemo(() => {
    const nodes: Node<TaskNodeData>[] = tasks.map((task) => ({
      id: task.id,
      type: 'taskNode',
      position: positions.get(task.id) ?? { x: 0, y: 0 },
      data: {
        task,
        liveState: liveStates[task.id] ?? null,
        onExpand,
        onCancel,
        onRerun,
        isExpanded: expandedTaskId === task.id,
      },
    }))

    const edges: Edge[] = []
    const taskIds = new Set(tasks.map((t) => t.id))
    for (const t of tasks) {
      for (const parent of t.depends_on_task_ids ?? []) {
        if (taskIds.has(parent)) {
          edges.push({
            id: `${parent}->${t.id}`,
            source: parent,
            target: t.id,
            type: 'default',
          })
        }
      }
    }

    return { nodes, edges }
  }, [tasks, positions, liveStates, onExpand, onCancel, onRerun, expandedTaskId])
}

export const GRAPH_LAYOUT_NODE_WIDTH = NODE_WIDTH
export const GRAPH_LAYOUT_NODE_HEIGHT = NODE_HEIGHT
