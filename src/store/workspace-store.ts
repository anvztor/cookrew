'use client'

import { createContext, useContext } from 'react'
import type { Repo, Cooker, ChatMessage, Bundle } from '@/types'

export interface WorkspaceState {
  readonly repos: readonly Repo[]
  readonly selectedRepoId: string
  readonly cookers: readonly Cooker[]
  readonly messages: readonly ChatMessage[]
  readonly bundles: readonly Bundle[]
  readonly selectedBundleId: string
}

export interface WorkspaceActions {
  readonly selectRepo: (repoId: string) => void
  readonly selectBundle: (bundleId: string) => void
  readonly sendMessage: (content: string) => void
}

export type WorkspaceContextValue = WorkspaceState & WorkspaceActions

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}
