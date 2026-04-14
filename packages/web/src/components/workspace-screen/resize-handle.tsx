import { Separator as PanelResizeHandle } from 'react-resizable-panels'
import type { ResizeHandleProps } from './types'

export function WorkspaceResizeHandle({
  ariaLabel,
  testId,
}: ResizeHandleProps) {
  return (
    <PanelResizeHandle
      aria-label={ariaLabel}
      className="group relative w-px bg-[#2D2A20] focus-visible:outline-none data-[dragging=true]:bg-[#9B8ACB]"
      data-testid={testId}
    >
      <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 cursor-col-resize" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[3px] rounded-full bg-[#FAF8F4] opacity-0 shadow-[0_0_0_1px_#2D2A20] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="h-[3px] w-[3px] rounded-full bg-[#2D2A20]" />
        <span className="h-[3px] w-[3px] rounded-full bg-[#2D2A20]" />
        <span className="h-[3px] w-[3px] rounded-full bg-[#2D2A20]" />
      </div>
    </PanelResizeHandle>
  )
}
