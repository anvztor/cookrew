'use client'

/**
 * Carries the bundle-scoped state the WorkflowGraphCard needs (tasks,
 * live states, expansion state, action handlers) into deeply-nested
 * EventGroupCard render branches without prop drilling.
 *
 * Used only by the 'workflow-graph' EventGroup case — the rest of the
 * feed renders work fine without it. EventGroupCard reads the context
 * lazily; consumers that don't need it (the sandbox) pass an empty
 * provider value.
 */

import { createContext, useContext, type ReactNode } from 'react'

import type { Bundle, Task } from '@cookrew/shared'

import type { TaskLiveState } from '@/hooks/use-task-stream'

export interface WorkflowFeedContextValue {
  readonly bundle: Bundle | null
  readonly tasks: readonly Task[]
  readonly liveStates: Readonly<Record<string, TaskLiveState>>
  readonly expandedTaskId: string | null
  readonly onExpandTask?: (taskId: string) => void
  readonly onCancelTask?: (taskId: string) => void
  readonly onRerunTask?: (taskId: string) => void
  /**
   * Transient error banner shown above the WorkflowGraphCard. Set by
   * cancel/rerun handlers when the API call fails; cleared by the
   * banner's own auto-dismiss or by clicking the X.
   */
  readonly errorMessage?: string | null
  readonly onDismissError?: () => void
}

const EMPTY_VALUE: WorkflowFeedContextValue = {
  bundle: null,
  tasks: [],
  liveStates: {},
  expandedTaskId: null,
  errorMessage: null,
}

const WorkflowFeedContext = createContext<WorkflowFeedContextValue>(EMPTY_VALUE)

export function WorkflowFeedProvider({
  value,
  children,
}: {
  readonly value: WorkflowFeedContextValue
  readonly children: ReactNode
}) {
  return <WorkflowFeedContext.Provider value={value}>{children}</WorkflowFeedContext.Provider>
}

export function useWorkflowFeed(): WorkflowFeedContextValue {
  return useContext(WorkflowFeedContext)
}
