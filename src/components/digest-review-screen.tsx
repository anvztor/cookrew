'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, History, ShieldAlert, X } from 'lucide-react'
import {
  BundleStatusBadge,
  DecisionBadge,
  EventTypeBadge,
  TaskStatusBadge,
} from '@/components/status-badge'
import { decideDigest, getDigestReviewData } from '@/lib/api'
import { formatRelativeTime, formatTimestamp } from '@/lib/format'
import type { DigestReviewData } from '@/types'

interface DigestReviewScreenProps {
  readonly recipeId: string
  readonly bundleId: string
}

export function DigestReviewScreen({
  recipeId,
  bundleId,
}: DigestReviewScreenProps) {
  const router = useRouter()
  const [data, setData] = useState<DigestReviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reviewer, setReviewer] = useState('cookrew-reviewer')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const nextData = await getDigestReviewData(recipeId, bundleId)
        if (isMounted) {
          setData(nextData)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load digest review.'
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
  }, [bundleId, recipeId])

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!data) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await decideDigest(recipeId, bundleId, {
        decision,
        decidedBy: reviewer.trim() || 'cookrew-reviewer',
        note,
      })

      router.push(result.redirectTo)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to save digest decision.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedBundle = data?.selectedBundle ?? null
  const digest = selectedBundle?.digest ?? null
  const reviewFlags = digest && selectedBundle
    ? [
        selectedBundle.tasks.some((task) => task.status === 'blocked')
          ? 'Contains blocked task outcomes that need a deliberate decision.'
          : null,
        digest.facts.length < 2
          ? 'Evidence pack is thin. Consider waiting for more fact references.'
          : null,
        digest.codeRefs.length === 0
          ? 'No code references were attached to this digest.'
          : null,
      ].filter(Boolean)
    : []

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary font-sans text-text-primary">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="page-header">
          <div className="flex flex-col gap-1">
            <h1 className="page-title">
              Cookrew / Digest Review
            </h1>
            <p className="text-[13px] font-medium text-text-secondary">
              Review and decision required for bundle persistence.
            </p>
          </div>

          <div className="button-row">
            <Link
              href={`/recipes/${recipeId}?bundle=${bundleId}`}
              className="button-base button-secondary"
            >
              <ArrowLeft size={16} />
              Back to Workspace
            </Link>
            <Link
              href={`/recipes/${recipeId}/history`}
              className="button-base button-secondary"
            >
              <History size={16} />
              Approved History
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-sm text-text-secondary">
            Loading digest review…
          </div>
        ) : error ? (
          <div className="p-6 text-sm font-medium text-rose-600">{error}</div>
        ) : !selectedBundle || !digest ? (
          <div className="p-6">
            <div className="empty-state">
              No digest is available for this bundle yet.
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden bg-bg-primary">
            <main className="flex-1 bg-bg-primary p-6 overflow-y-auto">
              <div className="surface-grid">
                <section className="panel p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-bold text-text-primary">Digest Summary</p>
                      <h2 className="text-[28px] font-bold text-text-primary">
                        Bundle {selectedBundle.bundle.id}
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <BundleStatusBadge status={selectedBundle.bundle.status} />
                      <DecisionBadge decision={digest.decision} />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7">{digest.summary}</p>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Task Results</p>
                      <p className="text-[28px] font-bold text-text-primary">
                        {digest.taskResults.length}
                      </p>
                    </div>
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Fact References</p>
                      <p className="text-[28px] font-bold text-text-primary">
                        {digest.facts.length}
                      </p>
                    </div>
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Code References</p>
                      <p className="text-[28px] font-bold text-text-primary">
                        {digest.codeRefs.length}
                      </p>
                    </div>
                    <div className="flex flex-col gap-[6px] border border-border-strong bg-bg-surface p-3">
                      <p className="text-[13px] font-bold text-text-primary">Submitted</p>
                      <p className="text-[14px] font-bold text-text-primary">
                        {formatRelativeTime(digest.submittedAt)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="panel p-4 md:p-5">
                  <p className="mb-4 text-[18px] font-bold text-text-primary">Task Outcomes</p>
                  <div className="space-y-3">
                    {selectedBundle.tasks.map((task) => {
                      const result = digest.taskResults.find(
                        (entry) => entry.taskId === task.id
                      )

                      return (
                        <div key={task.id} className="panel-muted p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="tiny-copy mt-1">
                                {result?.outcome ?? 'No explicit outcome recorded.'}
                              </p>
                            </div>
                            <TaskStatusBadge status={task.status} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="panel p-4 md:p-5">
                    <p className="mb-4 text-[18px] font-bold text-text-primary">Fact References</p>
                    <div className="space-y-3">
                      {digest.facts.map((fact) => (
                        <div key={fact.id} className="panel-muted p-3">
                          <p className="font-medium">{fact.claim}</p>
                          <p className="tiny-copy mt-1">
                            {fact.sourceTitle ?? 'Source note unavailable'}
                          </p>
                          <p className="tiny-copy mt-1">
                            Captured by {fact.capturedBy}
                            {fact.confidence !== null
                              ? ` · confidence ${Math.round(fact.confidence * 100)}%`
                              : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel p-4 md:p-5">
                    <p className="mb-4 text-[18px] font-bold text-text-primary">Code References</p>
                    <div className="space-y-3">
                      {digest.codeRefs.map((codeRef, index) => (
                        <div
                          key={`${codeRef.commitSha}-${codeRef.branch}-${index}`}
                          className="panel-muted p-3"
                        >
                          <p className="font-medium">{codeRef.branch}</p>
                          <p className="tiny-copy mt-1">{codeRef.repoUrl}</p>
                          <p className="tiny-copy mt-1">
                            Commit {codeRef.commitSha}
                          </p>
                          <p className="tiny-copy mt-2">
                            {codeRef.paths.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel p-4 md:p-5">
                  <p className="mb-4 text-[18px] font-bold text-text-primary">Relevant Timeline</p>
                  <div className="space-y-3">
                    {selectedBundle.events.map((event) => (
                      <div key={event.id} className="panel-muted p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <EventTypeBadge type={event.type} />
                            <span className="font-medium">{event.actorId}</span>
                          </div>
                          <span className="tiny-copy">
                            {formatRelativeTime(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6">{event.body}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </main>

            <aside className="flex w-[340px] flex-shrink-0 flex-col gap-5 border-l border-border-strong bg-bg-surface p-5 overflow-y-auto">
              <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                <p className="text-[18px] font-bold text-text-primary mb-3">Decision</p>
                <div className="space-y-3 text-sm">
                  <div className="panel-muted p-3">
                    <p className="text-[13px] font-bold text-text-primary">Submitted By</p>
                    <p>{digest.submittedBy}</p>
                    <p className="tiny-copy mt-1">
                      {formatTimestamp(digest.submittedAt)}
                    </p>
                  </div>
                  <div className="panel-muted p-3">
                    <p className="text-[13px] font-bold text-text-primary">Bundle Status</p>
                    <BundleStatusBadge status={selectedBundle.bundle.status} />
                  </div>
                  <label className="block">
                    <span className="field-label">Reviewer</span>
                    <input
                      value={reviewer}
                      onChange={(event) => setReviewer(event.target.value)}
                      className="text-input"
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Decision Note</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="text-area"
                      placeholder="Capture the merge note or what still needs work."
                    />
                  </label>
                </div>

                <div className="button-row mt-4">
                  <button
                    type="button"
                    onClick={() => void handleDecision('approved')}
                    className="button-base button-primary"
                    disabled={isSubmitting || digest.decision !== 'pending'}
                  >
                    <Check size={16} />
                    Approve Digest
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision('rejected')}
                    className="button-base button-danger"
                    disabled={isSubmitting || digest.decision !== 'pending'}
                  >
                    <X size={16} />
                    Reject Changes
                  </button>
                </div>

                {digest.decision !== 'pending' ? (
                  <p className="tiny-copy mt-3">
                    This digest already has a recorded decision.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border border-border-strong bg-bg-surface p-4">
                <p className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Review Flags
                </p>
                {reviewFlags.length === 0 ? (
                  <div className="panel-muted p-3 text-sm">
                    No major review flags surfaced from the current digest data.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewFlags.map((flag) => (
                      <div key={flag} className="panel-muted p-3 text-sm">
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
