'use client'

import { FolderGit2, FolderPlus } from 'lucide-react'
import { useWorkspace } from '@/store/workspace-store'

export function Cookbook() {
  const { repos, selectedRepoId, selectRepo } = useWorkspace()

  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <h3 className="text-[15px] font-bold text-stone-800 leading-tight">
        Cookbook
      </h3>

      <div className="flex flex-col gap-1 border border-border-strong bg-bg-surface p-1.5">
        {repos.map((repo) => {
          const isActive = repo.id === selectedRepoId
          return (
            <button
              key={repo.id}
              type="button"
              onClick={() => selectRepo(repo.id)}
              aria-pressed={isActive}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 w-full text-left
                transition-colors duration-150
                ${isActive
                  ? 'bg-[#FFD60033]'
                  : 'hover:bg-stone-100'
                }
              `}
            >
              <FolderGit2
                size={18}
                className="text-accent-secondary flex-shrink-0"
              />
              <span
                className={`text-[13px] text-[#5C4A1F] ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {repo.name}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="action-button"
      >
        <FolderPlus size={16} className="text-accent-secondary" />
        Add Repo
      </button>
    </div>
  )
}
