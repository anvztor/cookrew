'use client'

import { WorkspaceProvider } from '@/store/workspace-provider'
import { Cookbook } from '@/components/cookbook'
import { Cookers } from '@/components/cookers'
import { Chat } from '@/components/chat'
import { Timeline } from '@/components/timeline'
import { PanelResizer } from '@/components/panel-resizer'
import { MobileNav, useMobileTab } from '@/components/mobile-nav'
import { usePanelResizer } from '@/hooks/use-panel-resizer'

function WorkspaceLayout() {
  const { activeTab, setActiveTab } = useMobileTab()

  const leftResizer = usePanelResizer({
    initialWidth: 320,
    minWidth: 220,
    maxWidth: 480,
    direction: 'left',
  })

  const rightResizer = usePanelResizer({
    initialWidth: 340,
    minWidth: 240,
    maxWidth: 500,
    direction: 'right',
  })

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen bg-bg-surface overflow-hidden border border-border-strong">
        {/* Left Column: Cookbook + Cookers */}
        <div
          className="flex-shrink-0 flex flex-col h-full"
          style={{ width: leftResizer.width }}
        >
          <div className="border-b border-border-strong bg-bg-surface shrink-0">
            <Cookbook />
          </div>
          <div className="border-b border-border-strong h-0" />
          <div className="bg-bg-surface flex-1 min-h-0 overflow-hidden">
            <Cookers />
          </div>
        </div>

        {/* Left resizer */}
        <PanelResizer onMouseDown={leftResizer.onMouseDown} onTouchStart={leftResizer.onTouchStart} />

        {/* Center Column: Chat */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-bg-surface">
          <Chat />
        </div>

        {/* Right resizer */}
        <PanelResizer onMouseDown={rightResizer.onMouseDown} onTouchStart={rightResizer.onTouchStart} />

        {/* Right Column: Timeline */}
        <div
          className="flex-shrink-0 bg-bg-surface h-full overflow-y-auto border-l-0"
          style={{ width: rightResizer.width }}
        >
          <Timeline />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col h-screen bg-bg-surface pb-[60px]">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'cookbook' && (
            <div className="flex flex-col h-full">
              <div className="border-b border-border-strong bg-bg-surface">
                <Cookbook />
              </div>
              <div className="bg-bg-surface flex-1 min-h-0 overflow-hidden">
                <Cookers />
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="h-full p-2">
              <Chat />
            </div>
          )}
          {activeTab === 'timeline' && (
            <div className="h-full bg-bg-surface">
              <Timeline />
            </div>
          )}
        </div>
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  )
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <WorkspaceLayout />
    </WorkspaceProvider>
  )
}
