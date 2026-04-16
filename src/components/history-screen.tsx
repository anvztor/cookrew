'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { Download, FolderGit2, Search } from 'lucide-react'
import { DecisionBadge } from '@/components/status-badge'
import { getHistoryData } from '@/lib/api'
import {
  formatDateOnly,
  formatRelativeTime,
  formatTimestamp,
  truncateText,
} from '@/lib/format'
import type { HistoryData } from '@/types'

interface HistoryScreenProps {
  readonly recipeId: string
}

export function HistoryScreen({ recipeId }: HistoryScreenProps) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const nextData = await getHistoryData(recipeId)
        if (isMounted) {
          setData(nextData)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load approved digest history.'
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [recipeId])

  const filteredRecords = (data?.records ?? []).filter((record) => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) {
      return true
    }

    return (
      record.digest.summary.toLowerCase().includes(query) ||
      record.bundle?.prompt.toLowerCase().includes(query) ||
      record.bundle?.id.toLowerCase().includes(query)
    )
  })

  function handleExport() {
    if (!data) {
      return
    }

    const blob = new Blob([JSON.stringify(data.records, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${data.recipe.name}-approved-digests.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary font-sans text-text-primary">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="page-header">
          <div className="flex flex-col gap-1">
            <h1 className="page-title">
              COOKREW / APPROVED DIGEST HISTORY
            </h1>
            <p className="text-[13px] font-medium text-text-secondary">
              Durable record only · Ephemeral events expire after 7 days
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <label className="relative block min-w-[280px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search digests, bundles, or prompt text…"
                className="w-full border border-border-strong bg-bg-surface px-3 py-2.5 pl-9 text-[13px] text-text-primary outline-none transition-colors focus:border-text-primary"
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="button-base button-secondary"
              disabled={!data}
            >
              <Download size={16} />
              Export Approved
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-sm text-text-secondary">
            Loading approved history…
          </div>
        ) : error ? (
          <div className="p-6 text-sm font-medium text-rose-600">{error}</div>
        ) : !data ? (
          <div className="p-6">
            <div className="empty-state">History was not found.</div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden bg-bg-primary">
            <aside className="flex w-[300px] flex-shrink-0 flex-col gap-5 border-r border-border-strong bg-bg-surface p-5 overflow-y-auto">
              <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                <p className="text-[18px] font-bold text-text-primary">Recipe Metrics</p>
                <div className="space-y-3">
                  <div className="flex flex-col gap-[6px] border border-border-strong bg-amber-50 p-3">
                    <p className="text-[13px] font-bold text-text-primary">Approved Digests</p>
                    <p className="text-[28px] font-bold text-text-primary">
                      {data.metrics.approvedCount}
                    </p>
                  </div>
                  <div className="flex flex-col gap-[6px] border border-border-strong bg-amber-50 p-3">
                    <p className="text-[13px] font-bold text-text-primary">Median Review Time</p>
                    <p className="text-[28px] font-bold text-text-primary">
                      {data.metrics.medianReviewMinutes === null
                        ? 'N/A'
                        : `${data.metrics.medianReviewMinutes}m`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-[6px] border border-border-strong bg-amber-50 p-3">
                    <p className="text-[13px] font-bold text-text-primary">Most Recent Approval</p>
                    <p className="text-[14px] font-bold text-text-primary">
                      {formatDateOnly(data.metrics.mostRecentApprovalAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                <p className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                  <FolderGit2 size={16} />
                  Recipe Context
                </p>
                <p className="font-medium">{data.recipe.repoUrl}</p>
                <p className="tiny-copy mt-2">
                  Created {formatRelativeTime(data.recipe.createdAt)} by{' '}
                  {data.recipe.createdBy}
                </p>
                <div className="button-row mt-4">
                  <Link
                    href={`/recipes/${recipeId}`}
                    className="button-base button-secondary"
                  >
                    Back to Workspace
                  </Link>
                </div>
              </div>
            </aside>

            <main className="flex-1 bg-bg-primary p-6 overflow-y-auto">
              <div className="flex flex-col border border-border-strong bg-bg-surface">
                <div className="border-b border-border-strong px-4 py-4">
                  <p className="text-[18px] font-bold text-text-primary">Approved Digest Records</p>
                  <p className="tiny-copy mt-1">
                    {filteredRecords.length} approved digest
                    {filteredRecords.length === 1 ? '' : 's'} visible
                  </p>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="p-6">
                    <div className="empty-state">
                      No approved digests match that search yet.
                    </div>
                  </div>
                ) : (
                  <div>
                    {filteredRecords.map((record) => (
                      <article
                        key={record.digest.id}
                        className="table-row md:grid-cols-[minmax(0,2.1fr)_150px_180px]"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {record.bundle?.id ?? record.digest.bundleId}
                            </p>
                            <DecisionBadge decision={record.digest.decision} />
                          </div>
                          <p className="mt-2 text-sm leading-6">
                            {truncateText(record.digest.summary, 220)}
                          </p>
                          <p className="tiny-copy mt-2">
                            {record.digest.facts.length} facts ·{' '}
                            {record.digest.codeRefs.length} code refs
                          </p>
                        </div>

                        <div className="tiny-copy">
                          <p>Submitted {formatTimestamp(record.digest.submittedAt)}</p>
                          <p className="mt-1">
                            Approved {formatTimestamp(record.digest.decidedAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/recipes/${recipeId}/bundles/${record.digest.bundleId}/digest`}
                            className="button-inline"
                          >
                            Open Digest
                          </Link>
                          <Link
                            href={`/recipes/${recipeId}?bundle=${record.digest.bundleId}`}
                            className="button-inline"
                          >
                            Open Workspace
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
