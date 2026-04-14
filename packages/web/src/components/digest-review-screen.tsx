'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  CircleAlert,
  CircleCheck,
  Code,
  FileText,
  SkipForward,
  TriangleAlert,
  X,
} from 'lucide-react'
import { decideDigest, getDigestReviewData } from '@/lib/api'
import { formatDateOnly } from '@cookrew/shared'
import type {
  BundleWithDetails,
  CodeRef,
  DigestReviewData,
  FactRef,
  Task,
  TaskStatus,
} from '@cookrew/shared'

interface DigestReviewScreenProps {
  readonly recipeId: string
  readonly bundleId: string
}

function buildTaskOutcome(
  task: Task,
  events: readonly BundleWithDetails['events'][number][]
): string {
  const latestTaskEvent = [...events]
    .filter((event) => event.taskId === task.id && event.type !== 'task_claimed')
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0]

  if (latestTaskEvent?.body.trim()) {
    return latestTaskEvent.body.trim()
  }

  if (task.status === 'blocked') {
    return task.blockedReason?.trim()
      ? `Blocked: ${task.blockedReason.trim()}`
      : 'Task blocked.'
  }

  if (task.status === 'done') {
    return 'Task completed.'
  }

  if (task.status === 'cancelled') {
    return 'Task cancelled.'
  }

  return `Task is ${task.status}.`
}

function dedupeFacts(facts: readonly FactRef[]): FactRef[] {
  const seen = new Set<string>()
  const unique: FactRef[] = []

  for (const fact of facts) {
    const key = fact.id || [
      fact.claim,
      fact.sourceUrl ?? '',
      fact.sourceTitle ?? '',
      fact.capturedBy,
    ].join('::')

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    unique.push(fact)
  }

  return unique
}

function dedupeCodeRefs(codeRefs: readonly CodeRef[]): CodeRef[] {
  const seen = new Set<string>()
  const unique: CodeRef[] = []

  for (const codeRef of codeRefs) {
    const key = [
      codeRef.repoUrl,
      codeRef.branch,
      codeRef.commitSha,
      codeRef.paths.join('::'),
    ].join('::')

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    unique.push(codeRef)
  }

  return unique
}

function countAllPaths(codeRefs: readonly CodeRef[]): number {
  return codeRefs.reduce((total, ref) => total + ref.paths.length, 0)
}

function taskStatusIcon(status: TaskStatus) {
  if (status === 'done') {
    return <CircleCheck size={18} className="text-emerald-600" />
  }
  if (status === 'blocked') {
    return <CircleAlert size={18} className="text-amber-500" />
  }
  return <CircleCheck size={18} className="text-stone-400" />
}

function taskBadgeLabel(status: TaskStatus): string {
  if (status === 'done') return 'Merged'
  if (status === 'blocked') return 'Flagged'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

function taskBadgeClasses(status: TaskStatus): string {
  if (status === 'done') {
    return 'bg-[#7EB5A6] text-white border-[#5A9A8A]'
  }
  if (status === 'blocked') {
    return 'bg-[#FFD600] text-[#5C4A1F] border-[#2D2A20]'
  }
  return 'bg-stone-100 text-stone-700 border-stone-300'
}

function decisionBadgeLabel(decision: string): string {
  if (decision === 'approved') return 'Approved'
  if (decision === 'rejected') return 'Changes'
  return 'Pending Review'
}

function decisionBadgeClasses(decision: string): string {
  if (decision === 'approved') {
    return 'bg-[#7EB5A6] text-white border-[#5A9A8A]'
  }
  if (decision === 'rejected') {
    return 'bg-[#FFD600] text-[#5C4A1F] border-[#2D2A20]'
  }
  return 'bg-[#7EB5A6] text-white border-[#5A9A8A]'
}

export function DigestReviewScreen({
  recipeId,
  bundleId,
}: DigestReviewScreenProps) {
  const router = useRouter()
  const [data, setData] = useState<DigestReviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
        decidedBy: data.recipe.createdBy || 'cookrew-reviewer',
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
  const reviewFacts = selectedBundle
    ? dedupeFacts(
        digest?.facts ?? selectedBundle.events.flatMap((event) => event.facts)
      )
    : []
  const reviewCodeRefs = selectedBundle
    ? dedupeCodeRefs(
        digest?.codeRefs ?? selectedBundle.events.flatMap((event) => event.codeRefs)
      )
    : []
  const taskOutcomes = selectedBundle
    ? selectedBundle.tasks.map((task) => ({
        task,
        outcome:
          digest?.taskResults.find((entry) => entry.taskId === task.id)?.outcome ??
          buildTaskOutcome(task, selectedBundle.events),
      }))
    : []
  const reviewFlags = selectedBundle
    ? [
        selectedBundle.tasks.some((task) => task.status === 'blocked')
          ? 'Contains blocked task outcomes that need a deliberate decision.'
          : null,
        reviewFacts.length < 2
          ? 'Evidence pack is thin. Consider waiting for more fact references.'
          : null,
        reviewCodeRefs.length === 0
          ? 'No code references were attached to this digest.'
          : null,
      ].filter(Boolean)
    : []

  const filesChanged = countAllPaths(reviewCodeRefs)
  const completedTasks = selectedBundle
    ? selectedBundle.tasks.filter((t) => t.status === 'done').length
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans text-[#2D2A20]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#2D2A20] bg-[#FFFEF5] px-5 py-4">
        <h1 className="text-[22px] font-bold tracking-wide">
          COOKREW / DIGEST REVIEW
        </h1>
        <div className="flex items-center gap-3">
          {digest ? (
            <span className="inline-flex items-center rounded-md border border-[#2D2A20] bg-[#FFD600] px-2 py-0.5 text-xs font-medium text-[#5C4A1F]">
              Digest #{digest.id.slice(-4)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-[#2D2A20] bg-[#FFD600] px-2 py-0.5 text-xs font-medium text-[#5C4A1F]">
              Bundle {bundleId.slice(-6)}
            </span>
          )}
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
            digest ? decisionBadgeClasses(digest.decision) : 'bg-[#7EB5A6] text-white border-[#5A9A8A]'
          }`}>
            {digest ? decisionBadgeLabel(digest.decision) : 'Pending Review'}
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="p-6 text-sm text-[#57534E]">Loading digest review...</div>
      ) : error ? (
        <div className="p-6 text-sm font-medium text-rose-600">{error}</div>
      ) : !selectedBundle ? (
        <div className="p-6">
          <div className="border border-dashed border-[#2D2A20] bg-white/45 p-5 text-center text-[#57534E]">
            No review data is available for this bundle yet.
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-[#FAF8F4] p-6">
            <div className="flex flex-col gap-5">
              {/* Digest Summary Card */}
              <section className="border border-[#2D2A20] bg-[#FFFEF5]">
                <div className="flex items-center justify-between border-b border-[#2D2A20] px-4 py-3.5">
                  <span className="text-base font-bold">
                    {digest ? 'Digest Summary' : 'Live Bundle Trace'}
                  </span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {digest
                      ? `Generated ${formatDateOnly(digest.submittedAt)}`
                      : 'In progress'}
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <p className="text-sm leading-6 text-[#57534E]">
                    {digest
                      ? digest.summary
                      : selectedBundle.bundle.prompt}
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="flex flex-col gap-1 border border-[#2D2A20] bg-[#FFFBEB] p-3">
                      <span className="text-[22px] font-bold">{completedTasks}</span>
                      <span className="text-xs font-medium text-[#57534E]">Tasks Completed</span>
                    </div>
                    <div className="flex flex-col gap-1 border border-[#2D2A20] bg-[#ECFDF5] p-3">
                      <span className="text-[22px] font-bold">{filesChanged}</span>
                      <span className="text-xs font-medium text-[#57534E]">Files Changed</span>
                    </div>
                    <div className="flex flex-col gap-1 border border-[#2D2A20] bg-[#F3E8FF] p-3">
                      <span className="text-[22px] font-bold">{reviewFlags.length}</span>
                      <span className="text-xs font-medium text-[#57534E]">Flags Raised</span>
                    </div>
                    <div className="flex flex-col gap-1 border border-[#2D2A20] bg-[#EFF6FF] p-3">
                      <span className="text-[22px] font-bold">{reviewFacts.length}</span>
                      <span className="text-xs font-medium text-[#57534E]">Fact References</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Task Outcomes Card */}
              <section className="border border-[#2D2A20] bg-[#FFFEF5]">
                <div className="flex items-center justify-between border-b border-[#2D2A20] px-4 py-3.5">
                  <span className="text-base font-bold">Task Outcomes</span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {taskOutcomes.length} task{taskOutcomes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  {taskOutcomes.map(({ task, outcome }, index) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        index < taskOutcomes.length - 1
                          ? 'border-b border-[#2D2A20]'
                          : ''
                      }`}
                    >
                      {taskStatusIcon(task.status)}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold">{task.title}</span>
                        <span className="text-xs text-[#57534E]">{outcome}</span>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${taskBadgeClasses(task.status)}`}>
                        {taskBadgeLabel(task.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Fact References Card */}
              <section className="border border-[#2D2A20] bg-[#FFFEF5]">
                <div className="flex items-center justify-between border-b border-[#2D2A20] px-4 py-3.5">
                  <span className="text-base font-bold">Fact References</span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {reviewFacts.length} reference{reviewFacts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  {reviewFacts.length === 0 ? (
                    <div className="p-4 text-sm text-[#57534E]">
                      No fact references have been captured for this bundle yet.
                    </div>
                  ) : (
                    reviewFacts.map((fact, index) => (
                      <div
                        key={fact.id}
                        className={`flex items-center gap-2.5 px-4 py-2.5 ${
                          index < reviewFacts.length - 1
                            ? 'border-b border-[#E5E2DC]'
                            : ''
                        }`}
                      >
                        <FileText size={16} className="shrink-0 text-[#FFD600]" />
                        <span className="min-w-0 flex-1 text-[13px] font-medium">
                          {fact.claim}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#57534E]">
                          {fact.sourceTitle ?? fact.capturedBy}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Code References Card */}
              <section className="border border-[#2D2A20] bg-[#FFFEF5]">
                <div className="flex items-center justify-between border-b border-[#2D2A20] px-4 py-3.5">
                  <span className="text-base font-bold">Code References</span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {filesChanged} file{filesChanged !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  {reviewCodeRefs.length === 0 ? (
                    <div className="p-4 text-sm text-[#57534E]">
                      No code references have been attached to this bundle yet.
                    </div>
                  ) : (
                    reviewCodeRefs.flatMap((codeRef, refIndex) =>
                      codeRef.paths.map((filePath, pathIndex) => {
                        const isLast =
                          refIndex === reviewCodeRefs.length - 1 &&
                          pathIndex === codeRef.paths.length - 1
                        return (
                          <div
                            key={`${codeRef.commitSha}-${filePath}`}
                            className={`flex items-center gap-2.5 px-4 py-2.5 ${
                              isLast ? '' : 'border-b border-[#E5E2DC]'
                            }`}
                          >
                            <Code size={16} className="shrink-0 text-[#9333EA]" />
                            <span className="min-w-0 flex-1 font-mono text-xs font-medium">
                              {filePath}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] font-medium text-emerald-600">
                              {codeRef.commitSha.slice(0, 7)}
                            </span>
                          </div>
                        )
                      })
                    )
                  )}
                </div>
              </section>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="flex w-[360px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[#2D2A20] bg-[#FFFEF5] p-5">
            <h2 className="text-lg font-bold">Decision</h2>

            {/* Digest Metadata */}
            <div className="flex flex-col gap-2.5 border border-[#2D2A20] bg-[#FFFBEB] p-3.5">
              <span className="text-sm font-bold">Digest Metadata</span>
              <MetaRow label="Digest ID" value={digest ? `#${digest.id.slice(-4)}` : '--'} />
              <MetaRow label="Recipe" value={data?.recipe.name ?? '--'} />
              <MetaRow label="Branch" value={data?.recipe.defaultBranch ?? '--'} />
              <MetaRow label="Author" value={selectedBundle.bundle.createdBy} />
              <MetaRow
                label="Bundle Status"
                value={selectedBundle.bundle.status}
              />
              <MetaRow
                label="Created"
                value={formatDateOnly(selectedBundle.bundle.createdAt)}
              />
            </div>

            {/* Review Flags */}
            {reviewFlags.length > 0 && (
              <div className="flex flex-col gap-2 border border-[#2D2A20] bg-[#FEF2F2] p-3.5">
                <div className="flex items-center gap-2">
                  <TriangleAlert size={16} className="text-red-600" />
                  <span className="text-sm font-bold text-red-600">Review Flags</span>
                </div>
                {reviewFlags.map((flag) => (
                  <p key={flag} className="text-xs leading-[1.4] text-[#57534E]">
                    {flag}
                  </p>
                ))}
              </div>
            )}

            {/* Reviewer Note */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Reviewer Note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note for the digest decision log..."
                className="h-20 w-full border border-[#2D2A20] bg-[#FFFEF5] p-2.5 text-[13px] outline-none placeholder:text-[#A8A29E] focus-visible:ring-2 focus-visible:ring-[#FFD600]/30"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void handleDecision('approved')}
                disabled={isSubmitting || !digest || digest.decision !== 'pending'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2D2A20] bg-[#FFD600] px-4 py-2.5 text-sm font-medium text-[#5C4A1F] shadow-[4px_4px_0_#282623] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#282623] disabled:opacity-50 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <Check size={16} />
                Approve Digest
              </button>
              <button
                type="button"
                onClick={() => void handleDecision('rejected')}
                disabled={isSubmitting || !digest || digest.decision !== 'pending'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2D2A20] bg-[#FFFEF5] px-4 py-2.5 text-sm font-medium text-red-600 shadow-[4px_4px_0_#282623] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#282623] disabled:opacity-50 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <X size={16} />
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => router.push(`/recipes/${recipeId}`)}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2D2A20] bg-[#FFFEF5] px-4 py-2.5 text-sm font-medium text-[#5C4A1F] shadow-[4px_4px_0_#282623] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#282623] disabled:opacity-50 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <SkipForward size={16} />
                Defer Decision
              </button>
            </div>

            {/* Decision History */}
            {digest && digest.decision !== 'pending' && (
              <div className="flex flex-col gap-2.5 border-t border-[#E5E2DC] pt-3">
                <span className="text-[13px] font-bold">Decision History</span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${decisionBadgeClasses(digest.decision)}`}>
                      {decisionBadgeLabel(digest.decision)}
                    </span>
                    <span className="text-[11px] text-[#57534E]">
                      {formatDateOnly(digest.decidedAt)}
                    </span>
                  </div>
                  {digest.decidedBy && (
                    <span className="text-[11px] text-[#78716C]">
                      by {digest.decidedBy}
                    </span>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

function MetaRow({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-[#57534E]">{label}</span>
      <span className="font-mono text-xs font-medium">{value}</span>
    </div>
  )
}
