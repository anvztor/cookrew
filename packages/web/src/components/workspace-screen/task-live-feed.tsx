'use client'

import { useMemo } from 'react'

import { useTaskStream } from '@/hooks/use-task-stream'

import { TaskLiveCard } from './task-live-card'

/**
 * Stack of TaskLiveCards for all in-flight tasks in a recipe.
 *
 * Each card is independent and sticky — they stack when multiple
 * tasks run in parallel (e.g. a graph with parallel branches).
 *
 * Cards auto-disappear ~5s after a task reaches terminal status,
 * so the user sees a brief completion flash before the feed settles.
 */
export function TaskLiveFeed({
  recipeId,
  bundleId,
  onCancelTask,
}: {
  readonly recipeId: string
  readonly bundleId?: string
  readonly onCancelTask?: (taskId: string) => void
}) {
  const tasks = useTaskStream(recipeId, { bundleId })

  const liveTasks = useMemo(() => {
    return Object.values(tasks).sort((a, b) => {
      // Active tasks first, then by startedAt desc
      const aActive = a.status === 'claimed' || a.status === 'working'
      const bActive = b.status === 'claimed' || b.status === 'working'
      if (aActive !== bActive) return aActive ? -1 : 1
      const aStart = a.startedAt ? new Date(a.startedAt).getTime() : 0
      const bStart = b.startedAt ? new Date(b.startedAt).getTime() : 0
      return bStart - aStart
    })
  }, [tasks])

  if (liveTasks.length === 0) return null

  return (
    <div className="space-y-3">
      {liveTasks.map((state) => (
        <TaskLiveCard
          key={state.taskId}
          state={state}
          onCancel={onCancelTask}
        />
      ))}
    </div>
  )
}
