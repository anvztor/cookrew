import Link from 'next/link'
import { History, Search } from 'lucide-react'
import type { WorkspaceHeaderProps } from './types'
import { buttonClassName } from './shared'

export function WorkspaceHeader({
  historyHref,
  onSearchChange,
  searchValue,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 border-b border-[#2D2A20] bg-[#FFFEF5] px-3 sm:px-5 py-3 sm:py-4">
      <h1 className="m-0 text-[14px] sm:text-[22px] font-bold uppercase leading-none tracking-[0.02em] text-[#2D2A20]">
        <span className="hidden sm:inline">COOKREW / </span>WORKSPACE
      </h1>

      <div className="flex w-full flex-col gap-2 sm:gap-3 sm:w-auto sm:flex-row sm:items-center">
        <label className="relative block sm:min-w-[280px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
          />
          <input
            aria-label="Search workspace"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="w-full border border-[#2D2A20] bg-[#FFFEF5] px-3 py-[10px] pl-9 text-[13px] text-[#2D2A20] outline-none placeholder:text-[#6B6B6B]"
          />
        </label>

        <Link
          aria-label="Digests Tape"
          href={historyHref}
          className={buttonClassName('primary')}
        >
          <History size={16} className="text-[#9B8ACB]" />
          <span className="hidden sm:inline">Digests Tape</span>
          <span className="sm:hidden">History</span>
        </Link>
      </div>
    </header>
  )
}
