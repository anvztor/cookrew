'use client'

import { GripVertical } from 'lucide-react'

interface PanelResizerProps {
  readonly onMouseDown: (e: React.MouseEvent) => void
  readonly onTouchStart: (e: React.TouchEvent) => void
}

export function PanelResizer({ onMouseDown, onTouchStart }: PanelResizerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="
        group relative flex-shrink-0 w-px bg-border-strong
        cursor-col-resize select-none z-10
        hidden md:flex items-center justify-center
      "
    >
      <div
        className="
          absolute inset-y-0 -left-1.5 -right-1.5
          flex items-center justify-center
        "
      >
        <GripVertical
          size={12}
          className="text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        />
      </div>
    </div>
  )
}
