'use client'

import { useState } from 'react'
import { BookOpen, MessageSquare, Clock } from 'lucide-react'

type MobileTab = 'cookbook' | 'chat' | 'timeline'

const TABS = [
  { id: 'cookbook' as const, label: 'Cookbook', icon: BookOpen },
  { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  { id: 'timeline' as const, label: 'Timeline', icon: Clock },
] as const

interface MobileNavProps {
  readonly activeTab: MobileTab
  readonly onTabChange: (tab: MobileTab) => void
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-strong z-20">
      <div className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium
                transition-colors duration-150
                ${isActive ? 'text-stone-800 bg-accent-primary-light' : 'text-text-tertiary'}
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function useMobileTab() {
  const [activeTab, setActiveTab] = useState<MobileTab>('chat')
  return { activeTab, setActiveTab }
}

export type { MobileTab }
