'use client'

/**
 * Modal-style overlay that renders the full TaskLiveCard for one task.
 *
 * Mounted by the WorkspaceCenterPane when expandedTaskId !== null.
 * Reuses the existing TaskLiveCard component verbatim — the only
 * delta vs the legacy sticky stack is that the user opted into seeing
 * this card by clicking a graph node.
 *
 * Dismissal:
 *   - ESC key
 *   - click outside the panel (backdrop)
 *   - click the close (X) button on the panel header
 *   - clicking the same node again (handled upstream in the toggle
 *     semantics of onExpand)
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { TaskLiveCard } from '../task-live-card'
import type { TaskLiveState } from '@/hooks/use-task-stream'

export interface TaskExpandOverlayProps {
  readonly liveState: TaskLiveState | null
  readonly onClose: () => void
  readonly onCancel?: (taskId: string) => void
}

export function TaskExpandOverlay({ liveState, onClose, onCancel }: TaskExpandOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  // ESC dismissal. Captured at document level so it works even when
  // focus is inside the TaskLiveCard's textarea/buttons.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!liveState) {
    // Caller passed an expandedTaskId for which no live state exists yet
    // (e.g. task hasn't streamed any events). Render a minimal placeholder
    // so the overlay still appears — better than vanishing on click.
    return (
      <BackdropWrap onClose={onClose} panelRef={panelRef}>
        <header className="flex items-center justify-between border-b border-[#2D2A20] bg-[#FAF5E8] px-4 py-3">
          <h3 className="text-[14px] font-semibold text-[#2D2A20]">Task</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#57534E] hover:text-[#2D2A20]"
          >
            <X size={14} />
          </button>
        </header>
        <div className="px-4 py-6 text-[12px] text-[#A8A29E]">
          No live state for this task yet. Events will appear here as the
          agent streams them.
        </div>
      </BackdropWrap>
    )
  }

  return (
    <BackdropWrap onClose={onClose} panelRef={panelRef}>
      <header className="flex items-center justify-between border-b border-[#2D2A20] bg-[#FAF5E8] px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#57534E]">
          Task detail
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close (Esc)"
          title="Close (Esc)"
          className="rounded text-[#57534E] hover:text-[#2D2A20]"
        >
          <X size={14} />
        </button>
      </header>
      <div className="max-h-[80vh] overflow-y-auto p-3">
        <TaskLiveCard state={liveState} onCancel={onCancel} />
      </div>
    </BackdropWrap>
  )
}

function BackdropWrap({
  children,
  onClose,
  panelRef,
}: {
  readonly children: React.ReactNode
  readonly onClose: () => void
  readonly panelRef: React.RefObject<HTMLDivElement | null>
}) {
  // Click-outside: only fire onClose when the click target is the
  // backdrop itself, not anything inside the panel.
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl border border-[#2D2A20] bg-[#FFFEF5] shadow-[4px_4px_0_#2D2A20]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
