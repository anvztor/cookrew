'use client'

import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { WorkspaceContext, type WorkspaceState } from '@/store/workspace-store'
import { MOCK_REPOS, MOCK_COOKERS, MOCK_MESSAGES, MOCK_BUNDLES } from '@/data/mock'
import type { ChatMessage } from '@/types'

interface WorkspaceProviderProps {
  readonly children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [selectedRepoId, setSelectedRepoId] = useState('core')
  const [selectedBundleId, setSelectedBundleId] = useState('bundle-a')
  const [messages, setMessages] = useState<readonly ChatMessage[]>(MOCK_MESSAGES)

  const selectRepo = useCallback((repoId: string) => {
    setSelectedRepoId(repoId)
  }, [])

  const selectBundle = useCallback((bundleId: string) => {
    setSelectedBundleId(bundleId)
  }, [])

  const sendMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      bundleId: selectedBundleId,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      emoji: '',
      sender: 'You',
      content,
      tone: 'secondary',
    }
    setMessages((prev) => [...prev, newMessage])
  }, [selectedBundleId])

  const state: WorkspaceState = useMemo(() => ({
    repos: MOCK_REPOS,
    selectedRepoId,
    cookers: MOCK_COOKERS,
    messages,
    bundles: MOCK_BUNDLES,
    selectedBundleId,
  }), [selectedRepoId, selectedBundleId, messages])

  const value = useMemo(() => ({
    ...state,
    selectRepo,
    selectBundle,
    sendMessage,
  }), [state, selectRepo, selectBundle, sendMessage])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}
