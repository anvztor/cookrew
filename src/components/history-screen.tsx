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
    <div className="page-shell">
      <div className="page-frame min-h-[calc(100vh-40px)] overflow-hidden">
        <header className="page-header">
          <div>
            <p className="page-kicker">Cookrew / Approved Digest History</p>
            <h1 className="page-title">
              {data?.recipe.name ?? 'Approved Digest History'}
            </h1>
            <p className="page-copy">
              Approved digests become the durable record for a recipe. Use this
              view to review what was approved and when.
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
                className="text-input pl-9"
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="button-base button-primary"
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
          <div className="grid min-h-[calc(100vh-137px)] gap-px bg-border-strong xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="surface-grid bg-bg-surface p-4">
              <div className="panel p-4">
                <p className="field-label mb-2">Recipe Metrics</p>
                <div className="space-y-3">
                  <div className="metric-card">
                    <p className="field-label mb-1">Approved Digests</p>
                    <p className="text-4xl font-semibold">
                      {data.metrics.approvedCount}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="field-label mb-1">Median Review Time</p>
                    <p className="text-2xl font-semibold">
                      {data.metrics.medianReviewMinutes === null
                        ? 'N/A'
                        : `${data.metrics.medianReviewMinutes}m`}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="field-label mb-1">Most Recent Approval</p>
                    <p className="text-sm font-semibold">
                      {formatDateOnly(data.metrics.mostRecentApprovalAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="panel p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
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

            <main className="bg-bg-primary p-4 md:p-6">
              <div className="panel">
                <div className="border-b border-border-strong px-4 py-4">
                  <p className="text-lg font-semibold">Approved Digest Records</p>
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
