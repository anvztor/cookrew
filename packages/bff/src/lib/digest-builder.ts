import type {
  BundleWithDetails,
  CodeRef,
  Digest,
  FactRef,
} from '@cookrew/shared'

export function canSubmitDigest(bundleDetail: BundleWithDetails): boolean {
  return (
    ['cooked', 'blocked'].includes(bundleDetail.bundle.status) &&
    bundleDetail.tasks.every((task) =>
      ['done', 'blocked', 'cancelled'].includes(task.status)
    )
  )
}

export function pickDigestSubmitter(bundleDetail: BundleWithDetails): string {
  const latestAgentActor = [...bundleDetail.events]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .find((event) => event.actorType === 'agent')?.actorId

  if (latestAgentActor) {
    return latestAgentActor
  }

  const taskOwner = bundleDetail.tasks.find(
    (task) => task.claimedByAgentId
  )?.claimedByAgentId
  return taskOwner ?? 'cookrew-digest'
}

export function buildTaskOutcome(
  task: BundleWithDetails['tasks'][number],
  events: readonly BundleWithDetails['events'][number][]
): string {
  const latestTaskEvent = [...events]
    .filter(
      (event) => event.taskId === task.id && event.type !== 'task_claimed'
    )
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

export function dedupeFacts(facts: readonly FactRef[]): FactRef[] {
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

export function dedupeCodeRefs(codeRefs: readonly CodeRef[]): CodeRef[] {
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

export function buildDigestSummary(
  bundleDetail: BundleWithDetails,
  facts: readonly FactRef[],
  codeRefs: readonly CodeRef[]
): string {
  const doneCount = bundleDetail.tasks.filter(
    (task) => task.status === 'done'
  ).length
  const blockedCount = bundleDetail.tasks.filter(
    (task) => task.status === 'blocked'
  ).length
  const cancelledCount = bundleDetail.tasks.filter(
    (task) => task.status === 'cancelled'
  ).length

  const taskSummary =
    blockedCount > 0
      ? `The bundle reached a terminal state with ${doneCount} completed task${
          doneCount === 1 ? '' : 's'
        } and ${blockedCount} blocked task${blockedCount === 1 ? '' : 's'}.`
      : `The bundle completed with ${doneCount} finished task${
          doneCount === 1 ? '' : 's'
        }.`

  const cancelledSummary =
    cancelledCount > 0
      ? ` ${cancelledCount} task${cancelledCount === 1 ? ' was' : 's were'} cancelled.`
      : ''

  const evidenceSummary =
    facts.length > 0 || codeRefs.length > 0
      ? ` Attached evidence includes ${facts.length} fact reference${
          facts.length === 1 ? '' : 's'
        } and ${codeRefs.length} code reference${codeRefs.length === 1 ? '' : 's'}.`
      : ' No fact or code references were attached to the current bundle events.'

  return `${bundleDetail.bundle.prompt.trim()} ${taskSummary}${cancelledSummary}${evidenceSummary}`.trim()
}

export function buildDigestSubmission(bundleDetail: BundleWithDetails) {
  const facts = dedupeFacts(
    bundleDetail.events.flatMap((event) => event.facts)
  )
  const codeRefs = dedupeCodeRefs(
    bundleDetail.events.flatMap((event) => event.codeRefs)
  )

  return {
    submittedBy: pickDigestSubmitter(bundleDetail),
    summary: buildDigestSummary(bundleDetail, facts, codeRefs),
    taskResults: bundleDetail.tasks.map((task) => ({
      taskId: task.id,
      outcome: buildTaskOutcome(task, bundleDetail.events),
    })),
    facts,
    codeRefs,
  } as const
}

export function submissionToDemoInput(
  bundleId: string,
  submission: ReturnType<typeof buildDigestSubmission>
): {
  readonly bundleId: string
  readonly submittedBy: string
  readonly summary: string
  readonly taskResults: Digest['taskResults']
  readonly facts: Digest['facts']
  readonly codeRefs: Digest['codeRefs']
} {
  return {
    bundleId,
    submittedBy: submission.submittedBy,
    summary: submission.summary,
    taskResults: submission.taskResults,
    facts: submission.facts,
    codeRefs: submission.codeRefs,
  }
}
