'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Send } from 'lucide-react'
import { useWorkspace } from '@/store/workspace-store'

export function Chat() {
  const { messages, selectedBundleId, sendMessage } = useWorkspace()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

  const messagesWithTags = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      showBundleTag: Boolean(msg.bundleTag),
    }))
  }, [messages])

  useEffect(() => {
    if (!scrollRef.current) return
    const targetIndex = messages.findIndex(
      (m) => m.bundleId === selectedBundleId
    )
    if (targetIndex < 0) return

    const el = scrollRef.current.querySelector(
      `[data-bundle="${selectedBundleId}"]`
    )
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedBundleId, messages])

  const handleSend = useCallback(() => {
    if (!draft.trim()) return
    sendMessage(draft.trim())
    setDraft('')
  }, [draft, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 min-h-0 bg-bg-surface flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 pt-[18px] flex flex-col gap-2.5"
        >
          <h3 className="text-[15px] font-bold text-stone-800 leading-tight">
            Chat
          </h3>

          {messagesWithTags.map((msg) => (
            <p
              key={msg.id}
              data-bundle={msg.bundleId}
            className={`text-[13px] leading-[1.5] ${
                msg.tone === 'primary'
                  ? 'text-stone-800'
                  : 'text-[#6B6B6B]'
              }`}
            >
              {msg.showBundleTag ? `[${msg.bundleTag}] ` : ''}
              {msg.timestamp} {msg.emoji} {msg.sender}: {msg.content}
            </p>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-strong" />

      {/* Composer */}
      <div className="bg-bg-surface flex items-center gap-3 p-3.5">
        <input
          type="text"
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add timeline event or orchestration prompt…"
          className="flex-1 text-[13px] text-stone-800 placeholder:text-[#4D4D4D]
            bg-transparent outline-none leading-[1.4]"
        />
        <button
          type="button"
          onClick={handleSend}
          className="action-button flex-shrink-0"
        >
          <Send size={16} className="text-accent-secondary" />
          Send
        </button>
      </div>
    </div>
  )
}
