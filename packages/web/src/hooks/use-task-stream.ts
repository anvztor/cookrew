'use client'

import { useEffect, useReducer, useRef } from 'react'

import type { Event, Task, WatchEvent } from '@cookrew/shared'

import { openWatchStream } from '@/lib/watch-client'

/**
 * Task progress payload (ephemeral, updated via POST /tasks/{id}/progress).
 */
export interface TaskProgress {
  readonly summary: string
  readonly step: number | null
  readonly total: number | null
  readonly percent: number | null
  readonly updated_at: string
}

/**
 * Aggregated live state for a single running task.
 *
 * This is what the TaskLiveCard consumes: all we know about the task
 * RIGHT NOW, built up incrementally from SSE events.
 */
export interface TaskLiveState {
  readonly taskId: string
  readonly agentId: string | null
  readonly status: Task['status']
  readonly title: string | null
  readonly bundleId: string | null
  readonly startedAt: string | null
  readonly completedAt: string | null
  readonly progress: TaskProgress | null
  /** Ordered list of events posted to this task, deduped by sequence. */
  readonly events: readonly Event[]
  /** Highest seq seen, for incremental reasoning. */
  readonly lastSeq: number
}

// Raw task payload from the watch stream. Task type in @cookrew/shared
// has a slightly stricter shape; the wire format carries more fields.
type TaskPayload = Partial<Task> & {
  readonly id: string
  readonly status: Task['status']
  readonly assigned_agent_id?: string | null
  readonly progress?: TaskProgress | null
}

type TaskStreamAction =
  | { kind: 'task_status'; taskId: string; task: TaskPayload }
  | { kind: 'task_progress'; taskId: string; progress: TaskProgress }
  | { kind: 'task_event'; taskId: string; event: Event; seq: number }
  | { kind: 'task_removed'; taskId: string }
  | { kind: 'clear' }

type State = {
  readonly tasks: Readonly<Record<string, TaskLiveState>>
}

function emptyTask(taskId: string): TaskLiveState {
  return {
    taskId,
    agentId: null,
    status: 'open',
    title: null,
    bundleId: null,
    startedAt: null,
    completedAt: null,
    progress: null,
    events: [],
    lastSeq: 0,
  }
}

function reducer(state: State, action: TaskStreamAction): State {
  switch (action.kind) {
    case 'clear':
      return { tasks: {} }

    case 'task_removed': {
      const { [action.taskId]: _removed, ...rest } = state.tasks
      return { tasks: rest }
    }

    case 'task_status': {
      const existing = state.tasks[action.taskId] ?? emptyTask(action.taskId)
      const t = action.task
      const next: TaskLiveState = {
        ...existing,
        status: t.status,
        title: t.title ?? existing.title,
        bundleId: t.bundle_id ?? existing.bundleId,
        agentId: t.claimed_by_agent_id ?? t.assigned_agent_id ?? existing.agentId,
        startedAt: t.claimed_at ?? existing.startedAt,
        completedAt: t.completed_at ?? existing.completedAt,
      }
      return { tasks: { ...state.tasks, [action.taskId]: next } }
    }

    case 'task_progress': {
      const existing = state.tasks[action.taskId] ?? emptyTask(action.taskId)
      return {
        tasks: {
          ...state.tasks,
          [action.taskId]: { ...existing, progress: action.progress },
        },
      }
    }

    case 'task_event': {
      const existing = state.tasks[action.taskId] ?? emptyTask(action.taskId)
      // Dedupe by event.id — seq is server-assigned but events can arrive
      // multiple times on reconnect/replay.
      if (existing.events.some((e) => e.id === action.event.id)) {
        return state
      }
      // Insert in sequence order (newest events typically have higher seq).
      const merged = [...existing.events, action.event].sort(
        (a, b) => a.sequence - b.sequence,
      )
      return {
        tasks: {
          ...state.tasks,
          [action.taskId]: {
            ...existing,
            events: merged,
            lastSeq: Math.max(existing.lastSeq, action.seq),
          },
        },
      }
    }
  }
}

export interface UseTaskStreamOptions {
  /**
   * Restrict to tasks of a specific bundle. If not set, all live tasks
   * in the recipe are tracked.
   */
  bundleId?: string
  /**
   * Auto-remove tasks that reach a terminal status (done, blocked,
   * cancelled) after N ms. Set to 0 (the default) to keep terminal
   * tasks in state indefinitely so the user can review the full
   * session, tool calls, and agent reply. Pass a positive value
   * (e.g. 5000) to auto-dismiss after a flash of "completed."
   */
  terminalLingerMs?: number
}

/**
 * Subscribe to typed task:* channels for a recipe and aggregate live
 * state per running task.
 *
 * Returns a map of taskId → TaskLiveState. Consumers (TaskLiveCard)
 * iterate over the values and render one card per running task.
 */
export function useTaskStream(
  recipeId: string | null,
  options: UseTaskStreamOptions = {},
): Readonly<Record<string, TaskLiveState>> {
  const [state, dispatch] = useReducer(reducer, { tasks: {} })
  const lastSeqRef = useRef(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!recipeId) {
      dispatch({ kind: 'clear' })
      return
    }

    const handleEvent = (watch: WatchEvent) => {
      const channel = (watch as WatchEvent).channel ?? ''
      const resource = watch.resource_type
      const obj = watch.object as Record<string, unknown>
      const opts = optionsRef.current

      // Filter to bundle if requested
      if (opts.bundleId) {
        const bundleId =
          (obj.bundle_id as string | undefined) ??
          (obj.task_id && (obj as { bundle_id?: string }).bundle_id)
        if (bundleId && bundleId !== opts.bundleId) return
      }

      // Task row updates (status transitions, progress)
      if (resource === 'task') {
        const task = obj as TaskPayload
        if (!task.id) return

        if (channel === 'task:progress') {
          const progress = (obj.progress as TaskProgress | undefined) ?? null
          if (progress) {
            dispatch({ kind: 'task_progress', taskId: task.id, progress })
          }
        } else {
          dispatch({ kind: 'task_status', taskId: task.id, task })
        }

        // Terminal status — keep the card by default so the user
        // can review the completed run. Only schedule removal when
        // the caller explicitly asks for a positive linger.
        if (task.status === 'done' || task.status === 'blocked' || task.status === 'cancelled') {
          const linger = opts.terminalLingerMs ?? 0
          if (linger > 0) {
            setTimeout(() => dispatch({ kind: 'task_removed', taskId: task.id }), linger)
          }
        }
      }

      // Nested event rows (tool_use, tool_result, thinking, etc.)
      if (resource === 'event') {
        const event = obj as unknown as Event
        if (!event.task_id) return
        dispatch({ kind: 'task_event', taskId: event.task_id, event, seq: watch.seq })
      }
    }

    // Subscribe to all task-scoped channels.
    // Using `task:*` matches task:added, task:claimed, task:working,
    // task:progress, task:completed, task:failed, task:cancelled, etc.
    // `event:*` covers nested events (tool_use, tool_result, thinking).
    return openWatchStream(
      {
        recipeId,
        channels: ['task:*', 'event:*'],
        initialSeq: lastSeqRef.current,
      },
      (watch) => {
        if (watch.seq > lastSeqRef.current) lastSeqRef.current = watch.seq
        handleEvent(watch)
      },
    )
  }, [recipeId])

  return state.tasks
}
