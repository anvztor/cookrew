'use client'

import { Send } from 'lucide-react'
import { useWorkspace } from '@/store/workspace-store'

export function Cookers() {
  const { cookers } = useWorkspace()

  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <h3 className="text-[15px] font-bold text-stone-800">
        Cookers
      </h3>

      <div className="flex flex-col gap-2">
        {cookers.map((cooker) => (
          <p
            key={cooker.id}
            className="text-[13px] text-[#6B6B6B] font-normal leading-snug"
          >
            {cooker.emoji} {cooker.displayName} — {cooker.action}
          </p>
        ))}
      </div>

      <button
        type="button"
        className="action-button"
      >
        <Send size={16} className="text-accent-secondary" />
        Invite
      </button>
    </div>
  )
}
