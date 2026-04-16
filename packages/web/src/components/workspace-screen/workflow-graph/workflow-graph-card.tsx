'use client'

/**
 * WorkflowGraphCard — render one bundle's task DAG as a ReactFlow canvas.
 *
 * Phase 1 deliverable. Will be embedded into the event feed in Phase 2
 * (one card per turn / bundle), so it accepts everything via props and
 * has no opinion about its parent layout.
 *
 * Inputs:
 *   - tasks: the bundle's tasks (provides graph structure + static data)
 *   - liveStates: per-task TaskLiveState from useTaskStream (live events)
 *   - bundleId: shown in the header for traceability
 *   - bundlePrompt / bundleStatus: optional header context
 *   - onExpandTask / onCancelTask / onRerunTask: bubble up from TaskNode
 *
 * The card is sized by its parent — it uses 100% width and a fixed
 * `height` prop (defaults to 320px). The inner ReactFlow auto-fits.
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import type { Task } from '@cookrew/shared'

import type { TaskLiveState } from '@/hooks/use-task-stream'
import { useWorkflowFeed } from '../workflow-feed-context'
import { TaskNode } from './task-node'
import { useGraphLayout } from './use-graph-layout'

const DEFAULT_HEIGHT = 320

export interface WorkflowGraphCardProps {
  readonly tasks: readonly Task[]
  readonly liveStates: Readonly<Record<string, TaskLiveState>>
  readonly bundleId: string
  readonly bundlePrompt?: string | null
  readonly bundleStatus?: string | null
  readonly onExpandTask?: (taskId: string) => void
  readonly onCancelTask?: (taskId: string) => void
  readonly onRerunTask?: (taskId: string) => void
  readonly expandedTaskId?: string | null
  /** Override the canvas height. Defaults to 320px. */
  readonly height?: number
  readonly className?: string
}

const NODE_TYPES = { taskNode: TaskNode }

/**
 * Inner component that has access to ReactFlow's instance via the hook.
 * Wrapping in ReactFlowProvider lets multiple graph cards on the same
 * page each have their own viewport.
 */
function WorkflowGraphCardInner({
  tasks,
  liveStates,
  bundleId,
  bundlePrompt,
  bundleStatus,
  onExpandTask,
  onCancelTask,
  onRerunTask,
  expandedTaskId,
  height = DEFAULT_HEIGHT,
  className,
}: WorkflowGraphCardProps) {
  const { nodes, edges } = useGraphLayout({
    tasks,
    liveStates,
    onExpand: onExpandTask,
    onCancel: onCancelTask,
    onRerun: onRerunTask,
    expandedTaskId,
  })

  const rf = useReactFlow()

  // Re-fit when the structural shape of the graph changes (tasks add/remove).
  // We don't refit on every status flip — that would jerk the viewport.
  const taskCountRef = useRef(tasks.length)
  useEffect(() => {
    if (taskCountRef.current !== tasks.length) {
      taskCountRef.current = tasks.length
      // Small delay so dagre layout has settled.
      const id = setTimeout(() => rf.fitView({ padding: 0.2, duration: 250 }), 50)
      return () => clearTimeout(id)
    }
  }, [tasks.length, rf])

  if (tasks.length === 0) {
    // Empty bundle — caller should usually skip rendering, but defend.
    return (
      <div
        className={className}
        style={{
          height,
          border: '1px solid #E7E5E4',
          background: '#FFFEF5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#A8A29E',
          fontSize: 12,
        }}
      >
        Awaiting tasks for {bundleId}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        border: '1px solid #2D2A20',
        background: '#FFFEF5',
        boxShadow: '3px 3px 0 #2D2A20',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2D2A20',
          background: '#FAF5E8',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontFamily: 'ui-sans-serif, system-ui',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#57534E',
          }}
        >
          Workflow
        </span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#78716C' }}>
          {bundleId}
        </span>
        {bundleStatus && (
          <span style={{ fontSize: 11, color: '#57534E' }}>· {bundleStatus}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A8A29E' }}>
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </span>
      </header>
      {bundlePrompt && (
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid #E7E5E4',
            fontSize: 12,
            color: '#2D2A20',
            background: '#FFFEF5',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={bundlePrompt}
        >
          {bundlePrompt}
        </div>
      )}
      <ErrorBanner />
      {/* Single-task bundle: cap the canvas height so the node has
          breathing room without a giant empty area. ReactFlow renders
          a 1-node graph fine; we just shrink the chrome. */}
      <div style={{ height: nodes.length === 1 ? 160 : height, position: 'relative' }}>
        <ReactFlow
          nodes={[...nodes]}
          edges={[...edges]}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: nodes.length === 1 ? 0.4 : 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={nodes.length > 1}
          zoomOnScroll={nodes.length > 1}
          zoomOnPinch={nodes.length > 1}
        >
          <Background gap={16} size={1} color="#E7E5E4" />
          {nodes.length > 1 && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
    </div>
  )
}

export function WorkflowGraphCard(props: WorkflowGraphCardProps) {
  // Provider per card → independent viewports across multiple cards.
  return (
    <ReactFlowProvider>
      <WorkflowGraphCardInner {...props} />
    </ReactFlowProvider>
  )
}

/**
 * Inline error banner — shows the latest cancel/rerun failure for ~4s
 * then auto-dismisses. Reads errorMessage + onDismissError from
 * WorkflowFeedContext, so it's silent when no provider supplies them
 * (e.g. the sandbox harness which doesn't wire errors).
 */
function ErrorBanner() {
  const { errorMessage, onDismissError } = useWorkflowFeed()

  useEffect(() => {
    if (!errorMessage || !onDismissError) return
    const id = setTimeout(() => onDismissError(), 4000)
    return () => clearTimeout(id)
  }, [errorMessage, onDismissError])

  if (!errorMessage) return null

  return (
    <div
      role="alert"
      style={{
        padding: '6px 12px',
        borderBottom: '1px solid #DC2626',
        background: '#FEE2E2',
        color: '#991B1B',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ flex: 1 }}>{errorMessage}</span>
      {onDismissError && (
        <button
          type="button"
          onClick={onDismissError}
          aria-label="Dismiss error"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: '#991B1B',
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
