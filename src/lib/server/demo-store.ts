import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { generateTaskSeeds, normalizeTaskSeeds } from '@/lib/task-seeds'
import { publishRecipeStream } from '@/lib/server/stream-hub'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  Digest,
  Event,
  Recipe,
  RecipeMember,
  Task,
} from '@/types'

interface DemoState {
  recipes: Recipe[]
  members: RecipeMember[]
  agents: AgentPresence[]
  bundles: Bundle[]
  tasks: Task[]
  events: Event[]
  digests: Digest[]
}

const STORE_PATH = join(process.cwd(), '.next', 'demo-store.json')

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readState(): DemoState {
  if (!existsSync(STORE_PATH)) {
    const initialState = createInitialState()
    writeState(initialState)
    return initialState
  }

  return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DemoState
}

function writeState(state: DemoState): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(state, null, 2))
}

function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function createInitialState(): DemoState {
  const recipes: Recipe[] = [
    {
      id: 'rec_platform',
      name: 'platform-core',
      repoUrl: 'git@github.com:krew/platform-core.git',
      defaultBranch: 'main',
      createdBy: 'mia.owner',
      createdAt: isoMinutesAgo(60 * 24 * 12),
    },
    {
      id: 'rec_chipotle',
      name: 'chipotle',
      repoUrl: 'git@github.com:krew/chipotle.git',
      defaultBranch: 'main',
      createdBy: 'leo.publisher',
      createdAt: isoMinutesAgo(60 * 24 * 6),
    },
    {
      id: 'rec_growth',
      name: 'growth-v2',
      repoUrl: 'git@github.com:krew/growth-v2.git',
      defaultBranch: 'stable',
      createdBy: 'ava.lead',
      createdAt: isoMinutesAgo(60 * 24 * 3),
    },
    {
      id: 'rec_audit',
      name: 'audit-run',
      repoUrl: 'git@github.com:krew/audit-run.git',
      defaultBranch: 'develop',
      createdBy: 'drew.ops',
      createdAt: isoMinutesAgo(60 * 22),
    },
  ]

  const members: RecipeMember[] = [
    member('mem_platform_owner', 'rec_platform', 'mia.owner', 'human', 'owner', 60 * 24 * 12),
    member('mem_platform_dev', 'rec_platform', 'sam.reviewer', 'human', 'member', 60 * 24 * 10),
    member('mem_platform_ops', 'rec_platform', 'ori.pm', 'human', 'member', 60 * 24 * 8),
    member('mem_chipotle_owner', 'rec_chipotle', 'leo.publisher', 'human', 'owner', 60 * 24 * 6),
    member('mem_growth_owner', 'rec_growth', 'ava.lead', 'human', 'owner', 60 * 24 * 3),
    member('mem_audit_owner', 'rec_audit', 'drew.ops', 'human', 'owner', 60 * 22),
  ]

  const agents: AgentPresence[] = [
    agent('ag_planner', 'rec_platform', 'planner-omega', ['planning', 'routing'], 'busy', 2, 'task_pending_review'),
    agent('ag_codex', 'rec_platform', 'codex-frontend', ['nextjs', 'typescript'], 'online', 6, null),
    agent('ag_claude', 'rec_platform', 'claude-review', ['review', 'digest'], 'online', 9, null),
    agent('ag_bub', 'rec_platform', 'bub-scout', ['research', 'facts'], 'offline', 44, null),
    agent('ag_chipotle', 'rec_chipotle', 'codex-growth', ['landing-pages'], 'online', 5, null),
    agent('ag_growth', 'rec_growth', 'claude-copy', ['copywriting'], 'busy', 3, 'task_growth_bundle'),
    agent('ag_audit', 'rec_audit', 'bub-audit', ['ci', 'tests'], 'online', 7, null),
  ]

  const bundles: Bundle[] = [
    bundle('bun_platform_pending', 'rec_platform', 'Finalize release-hardening sweep for Phase 3 and prep the digest for approval.', 'cooked', 'mia.owner', 180, 160, 30, null, null),
    bundle('bun_platform_active', 'rec_platform', 'Stand up the live reschedule workflow for Cookrew Phase 3.', 'claimed', 'mia.owner', 80, 70, null, null, null),
    bundle('bun_platform_approved', 'rec_platform', 'Stabilize cookbook dashboard filters and digest export.', 'digested', 'sam.reviewer', 60 * 24, 60 * 24 - 120, 60 * 24 - 70, 60 * 24 - 40, null),
    bundle('bun_chipotle_open', 'rec_chipotle', 'Refresh partner rollout assets before Friday.', 'open', 'leo.publisher', 55, null, null, null, null),
    bundle('bun_growth_blocked', 'rec_growth', 'Rework growth bundle onboarding copy and QA handoff.', 'blocked', 'ava.lead', 220, 205, null, null, 'Waiting on legal copy sign-off'),
    bundle('bun_audit_done', 'rec_audit', 'Prepare audit summary bundle for durable approval.', 'digested', 'drew.ops', 500, 490, 460, 430, null),
  ]

  const tasks: Task[] = [
    task('task_pending_summary', 'bun_platform_pending', 'Summarize regressions and release notes', 'done', [], 'ag_planner', 170, 120, null),
    task('task_pending_refs', 'bun_platform_pending', 'Verify facts and attach code refs', 'done', ['task_pending_summary'], 'ag_claude', 150, 90, null),
    task('task_pending_review', 'bun_platform_pending', 'Review digest narrative and approvals', 'done', ['task_pending_refs'], 'ag_planner', 60, 30, null),
    task('task_active_scope', 'bun_platform_active', 'Define workspace UX delta', 'done', [], 'ag_codex', 78, 55, null),
    task('task_active_sse', 'bun_platform_active', 'Wire API client and SSE updates', 'working', ['task_active_scope'], 'ag_planner', 70, null, null),
    task('task_active_history', 'bun_platform_active', 'Connect approved history route', 'open', ['task_active_sse'], null, null, null, null),
    task('task_chipotle_open', 'bun_chipotle_open', 'Draft partner launch checklist', 'open', [], null, null, null, null),
    task('task_growth_bundle', 'bun_growth_blocked', 'Rewrite handoff narrative', 'blocked', [], 'ag_growth', 200, null, 'Awaiting approved brand language'),
    task('task_growth_followup', 'bun_growth_blocked', 'Update launch checklist copy', 'open', ['task_growth_bundle'], null, null, null, null),
    task('task_audit_1', 'bun_audit_done', 'Collect final audit facts', 'done', [], 'ag_audit', 490, 470, null),
    task('task_audit_2', 'bun_audit_done', 'Submit approved audit digest', 'done', ['task_audit_1'], 'ag_audit', 465, 430, null),
  ]

  const digests: Digest[] = [
    digest(
      'dig_platform_pending',
      'rec_platform',
      'bun_platform_pending',
      'Phase 3 release hardening is complete and ready for human approval. The digest packages the launch narrative, validated facts, and the code refs needed for merge readiness.',
      [
        { taskId: 'task_pending_summary', outcome: 'Release summary and reviewer notes are complete.' },
        { taskId: 'task_pending_refs', outcome: 'Fact pack and code references were verified against the active branch.' },
        { taskId: 'task_pending_review', outcome: 'Approval checklist is complete and only the final human decision remains.' },
      ],
      [
        fact('fact_platform_1', 'Online status is derived from the latest heartbeat inside the 30 second window.', 'planner-omega', 'https://example.com/heartbeat', 'Heartbeat logic', 0.94),
        fact('fact_platform_2', 'Recipe history persists only approved digests.', 'claude-review', 'https://example.com/history', 'Digest retention notes', 0.9),
        fact('fact_platform_3', 'The digest review route can load by bundle id without relying on client state.', 'codex-frontend', null, null, 0.86),
      ],
      [
        codeRef('git@github.com:krew/platform-core.git', 'phase3/release-hardening', '1ad4e3f', ['cookrew/src/app', 'cookrew/src/lib']),
        codeRef('git@github.com:krew/platform-core.git', 'phase3/release-hardening', '1ad4e3f', ['krewhub/src/krewhub/routes/bundles.py']),
      ],
      'claude-review',
      25,
      'pending',
      null,
      null
    ),
    digest(
      'dig_platform_approved',
      'rec_platform',
      'bun_platform_approved',
      'Cookbook filtering and export controls shipped with validated history persistence and a durable digest anchor.',
      [
        { taskId: 'task_platform_approved_1', outcome: 'Cookbook filter interactions were stabilized.' },
      ],
      [
        fact('fact_platform_approved', 'Approved digests remain durable records.', 'sam.reviewer', null, null, 0.88),
      ],
      [
        codeRef('git@github.com:krew/platform-core.git', 'main', '4bc9d12', ['cookrew/src/components', 'krewhub/src/krewhub/tape']),
      ],
      'sam.reviewer',
      60 * 24 - 60,
      'approved',
      'mia.owner',
      60 * 24 - 40
    ),
    digest(
      'dig_audit_approved',
      'rec_audit',
      'bun_audit_done',
      'Audit bundle approved with final verification for CI and deployment evidence.',
      [
        { taskId: 'task_audit_1', outcome: 'Evidence gathered and annotated.' },
        { taskId: 'task_audit_2', outcome: 'Final audit digest approved.' },
      ],
      [
        fact('fact_audit_approved', 'Audit record was written after digest approval.', 'bub-audit', null, null, 0.91),
      ],
      [
        codeRef('git@github.com:krew/audit-run.git', 'main', '92dc001', ['audit/summary.md', 'ci/pipeline.yml']),
      ],
      'bub-audit',
      440,
      'approved',
      'drew.ops',
      430
    ),
  ]

  const events: Event[] = [
    event('evt_pending_prompt', 'rec_platform', 'bun_platform_pending', null, 'prompt', 'mia.owner', 'human', 'Finalize release-hardening sweep for Phase 3 and prep the digest for approval.', 180),
    event('evt_pending_plan', 'rec_platform', 'bun_platform_pending', null, 'plan', 'system', 'system', 'Created bundle with 3 tasks and staged reviewer follow-up.', 176),
    event('evt_pending_claim', 'rec_platform', 'bun_platform_pending', 'task_pending_summary', 'task_claimed', 'ag_planner', 'agent', "Task 'Summarize regressions and release notes' claimed.", 170),
    event('evt_pending_fact', 'rec_platform', 'bun_platform_pending', 'task_pending_refs', 'fact_added', 'ag_claude', 'agent', 'Captured facts for heartbeat freshness and durable history.', 92, [
      digests[0].facts[0],
      digests[0].facts[1],
    ]),
    event('evt_pending_code', 'rec_platform', 'bun_platform_pending', 'task_pending_refs', 'code_pushed', 'ag_codex', 'agent', 'Attached release-hardening code refs for review.', 88, [], digests[0].codeRefs),
    event('evt_pending_digest', 'rec_platform', 'bun_platform_pending', null, 'digest_submitted', 'claude-review', 'agent', 'Digest submitted and awaiting final human approval.', 25),
    event('evt_active_prompt', 'rec_platform', 'bun_platform_active', null, 'prompt', 'mia.owner', 'human', 'Stand up the live reschedule workflow for Cookrew Phase 3.', 80),
    event('evt_active_plan', 'rec_platform', 'bun_platform_active', null, 'plan', 'system', 'system', 'Created bundle with 3 tasks.', 79),
    event('evt_active_scope', 'rec_platform', 'bun_platform_active', 'task_active_scope', 'milestone', 'ag_codex', 'agent', 'Workspace layout delta is documented and ready for implementation.', 56),
    event('evt_active_sse', 'rec_platform', 'bun_platform_active', 'task_active_sse', 'milestone', 'ag_planner', 'agent', 'SSE route proxy is in progress with reconnect-safe handling.', 18),
    event('evt_platform_approved', 'rec_platform', 'bun_platform_approved', null, 'digest_approved', 'mia.owner', 'human', 'Digest approved and recorded as durable recipe history.', 60 * 24 - 40),
    event('evt_chipotle_prompt', 'rec_chipotle', 'bun_chipotle_open', null, 'prompt', 'leo.publisher', 'human', 'Refresh partner rollout assets before Friday.', 55),
    event('evt_growth_blocked', 'rec_growth', 'bun_growth_blocked', 'task_growth_bundle', 'milestone', 'ag_growth', 'agent', 'Dependency is blocked on approved brand language.', 205),
    event('evt_audit_approved', 'rec_audit', 'bun_audit_done', null, 'digest_approved', 'drew.ops', 'human', 'Audit digest approved and archived.', 430),
  ]

  return {
    recipes,
    members,
    agents,
    bundles,
    tasks,
    events,
    digests,
  }
}

function member(
  id: string,
  recipeId: string,
  actorId: string,
  actorType: 'human' | 'agent',
  role: 'owner' | 'member' | 'agent',
  joinedMinutesAgo: number
): RecipeMember {
  return {
    id,
    recipeId,
    actorId,
    actorType,
    role,
    joinedAt: isoMinutesAgo(joinedMinutesAgo),
  }
}

function agent(
  agentId: string,
  recipeId: string,
  displayName: string,
  capabilities: string[],
  status: AgentPresence['status'],
  heartbeatMinutesAgo: number,
  currentTaskId: string | null
): AgentPresence {
  return {
    agentId,
    recipeId,
    displayName,
    capabilities,
    status,
    lastHeartbeatAt: isoMinutesAgo(heartbeatMinutesAgo),
    currentTaskId,
  }
}

function bundle(
  id: string,
  recipeId: string,
  prompt: string,
  status: Bundle['status'],
  createdBy: string,
  createdMinutesAgo: number,
  claimedMinutesAgo: number | null,
  cookedMinutesAgo: number | null,
  digestedMinutesAgo: number | null,
  blockedReason: string | null
): Bundle {
  return {
    id,
    recipeId,
    prompt,
    status,
    createdBy,
    createdAt: isoMinutesAgo(createdMinutesAgo),
    claimedAt: claimedMinutesAgo === null ? null : isoMinutesAgo(claimedMinutesAgo),
    cookedAt: cookedMinutesAgo === null ? null : isoMinutesAgo(cookedMinutesAgo),
    digestedAt: digestedMinutesAgo === null ? null : isoMinutesAgo(digestedMinutesAgo),
    blockedReason,
  }
}

function task(
  id: string,
  bundleId: string,
  title: string,
  status: Task['status'],
  dependsOnTaskIds: string[],
  claimedByAgentId: string | null,
  claimedMinutesAgo: number | null,
  completedMinutesAgo: number | null,
  blockedReason: string | null
): Task {
  return {
    id,
    bundleId,
    title,
    description: null,
    status,
    dependsOnTaskIds,
    claimedByAgentId,
    claimedAt: claimedMinutesAgo === null ? null : isoMinutesAgo(claimedMinutesAgo),
    completedAt: completedMinutesAgo === null ? null : isoMinutesAgo(completedMinutesAgo),
    blockedReason,
  }
}

function fact(
  id: string,
  claim: string,
  capturedBy: string,
  sourceUrl: string | null,
  sourceTitle: string | null,
  confidence: number | null
) {
  return {
    id,
    claim,
    sourceUrl,
    sourceTitle,
    capturedBy,
    confidence,
  }
}

function codeRef(
  repoUrl: string,
  branch: string,
  commitSha: string,
  paths: string[]
) {
  return {
    repoUrl,
    branch,
    commitSha,
    paths,
  }
}

function digest(
  id: string,
  recipeId: string,
  bundleId: string,
  summary: string,
  taskResults: Digest['taskResults'],
  facts: Digest['facts'],
  codeRefs: Digest['codeRefs'],
  submittedBy: string,
  submittedMinutesAgo: number,
  decision: Digest['decision'],
  decidedBy: string | null,
  decidedMinutesAgo: number | null
): Digest {
  return {
    id,
    recipeId,
    bundleId,
    summary,
    taskResults,
    facts,
    codeRefs,
    submittedBy,
    submittedAt: isoMinutesAgo(submittedMinutesAgo),
    decision,
    decidedBy,
    decidedAt: decidedMinutesAgo === null ? null : isoMinutesAgo(decidedMinutesAgo),
  }
}

function event(
  id: string,
  recipeId: string,
  bundleId: string,
  taskId: string | null,
  type: Event['type'],
  actorId: string,
  actorType: Event['actorType'],
  body: string,
  createdMinutesAgo: number,
  facts: Event['facts'] = [],
  codeRefs: Event['codeRefs'] = []
): Event {
  return {
    id,
    recipeId,
    bundleId,
    taskId,
    type,
    actorId,
    actorType,
    body,
    facts,
    codeRefs,
    createdAt: isoMinutesAgo(createdMinutesAgo),
    expiresAt: null,
  }
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function resetDemoState(): void {
  writeState(createInitialState())
}

export function listRecipes(): Recipe[] {
  return clone(readState().recipes)
}

export function getRecipe(recipeId: string): Recipe | null {
  const recipe = readState().recipes.find((entry) => entry.id === recipeId)
  return recipe ? clone(recipe) : null
}

export function listMembers(recipeId: string): RecipeMember[] {
  return clone(readState().members.filter((entry) => entry.recipeId === recipeId))
}

export function listAgents(recipeId: string): AgentPresence[] {
  return clone(readState().agents.filter((entry) => entry.recipeId === recipeId))
}

export function listBundles(recipeId: string): Bundle[] {
  const state = readState()
  return clone(
    state.bundles
      .filter((entry) => entry.recipeId === recipeId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  )
}

export function getBundle(bundleId: string): Bundle | null {
  const bundle = readState().bundles.find((entry) => entry.id === bundleId)
  return bundle ? clone(bundle) : null
}

export function listTasks(bundleId: string): Task[] {
  return clone(readState().tasks.filter((entry) => entry.bundleId === bundleId))
}

export function listEvents(bundleId: string): Event[] {
  const state = readState()
  return clone(
    state.events
      .filter((entry) => entry.bundleId === bundleId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  )
}

export function getDigestByBundle(bundleId: string): Digest | null {
  const digest = readState().digests.find((entry) => entry.bundleId === bundleId)
  return digest ? clone(digest) : null
}

export function listApprovedDigests(recipeId: string): Digest[] {
  const state = readState()
  return clone(
    state.digests
      .filter((entry) => entry.recipeId === recipeId && entry.decision === 'approved')
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  )
}

export function getBundleWithDetails(bundleId: string): BundleWithDetails | null {
  const bundle = getBundle(bundleId)
  if (!bundle) {
    return null
  }

  return {
    bundle,
    tasks: listTasks(bundleId),
    events: listEvents(bundleId),
    digest: getDigestByBundle(bundleId),
  }
}

export function createRecipeInDemo(input: {
  name: string
  repoUrl: string
  defaultBranch: string
  createdBy: string
}): Recipe {
  const state = readState()
  const recipe: Recipe = {
    id: nextId('rec'),
    name: input.name,
    repoUrl: input.repoUrl,
    defaultBranch: input.defaultBranch,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  }

  const owner: RecipeMember = {
    id: nextId('mem'),
    recipeId: recipe.id,
    actorId: input.createdBy,
    actorType: 'human',
    role: 'owner',
    joinedAt: recipe.createdAt,
  }

  state.recipes.unshift(recipe)
  state.members.unshift(owner)
  writeState(state)

  return clone(recipe)
}

export function createBundleInDemo(input: {
  recipeId: string
  prompt: string
  requestedBy: string
  taskTitles: readonly string[]
}): BundleWithDetails {
  const state = readState()
  const taskTitles = normalizeTaskSeeds(input.taskTitles)
  const effectiveTaskTitles =
    taskTitles.length > 0 ? taskTitles : generateTaskSeeds(input.prompt)
  const now = new Date().toISOString()

  const createdBundle: Bundle = {
    id: nextId('bun'),
    recipeId: input.recipeId,
    prompt: input.prompt,
    status: 'open',
    createdBy: input.requestedBy,
    createdAt: now,
    claimedAt: null,
    cookedAt: null,
    digestedAt: null,
    blockedReason: null,
  }

  const createdTasks = effectiveTaskTitles.map((title, index) => ({
    id: nextId('task'),
    bundleId: createdBundle.id,
    title,
    description: null,
    status: index === 0 ? 'claimed' : 'open',
    dependsOnTaskIds: index === 0 ? [] : [],
    claimedByAgentId: index === 0 ? 'ag_codex' : null,
    claimedAt: index === 0 ? now : null,
    completedAt: null,
    blockedReason: null,
  } satisfies Task))

  const promptEvent: Event = {
    id: nextId('evt'),
    recipeId: input.recipeId,
    bundleId: createdBundle.id,
    taskId: null,
    type: 'prompt',
    actorId: input.requestedBy,
    actorType: 'human',
    body: input.prompt,
    facts: [],
    codeRefs: [],
    createdAt: now,
    expiresAt: null,
  }

  const planEvent: Event = {
    id: nextId('evt'),
    recipeId: input.recipeId,
    bundleId: createdBundle.id,
    taskId: null,
    type: 'plan',
    actorId: 'system',
    actorType: 'system',
    body: `Created bundle with ${createdTasks.length} starter tasks.`,
    facts: [],
    codeRefs: [],
    createdAt: now,
    expiresAt: null,
  }

  state.bundles.unshift(createdBundle)
  state.tasks.unshift(...createdTasks)
  state.events.unshift(planEvent, promptEvent)
  writeState(state)

  publishRecipeStream(input.recipeId, 'bundle.created', {
    bundleId: createdBundle.id,
    status: createdBundle.status,
    taskCount: createdTasks.length,
  })

  return {
    bundle: clone(createdBundle),
    tasks: clone(createdTasks),
    events: clone([planEvent, promptEvent]),
    digest: null,
  }
}

export function decideDigestInDemo(input: {
  bundleId: string
  decision: 'approved' | 'rejected'
  decidedBy: string
  note?: string
}): Digest | null {
  const state = readState()
  const digestIndex = state.digests.findIndex((entry) => entry.bundleId === input.bundleId)
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)

  if (digestIndex < 0 || bundleIndex < 0) {
    return null
  }

  const decidedAt = new Date().toISOString()
  const currentDigest = state.digests[digestIndex]
  const updatedDigest: Digest = {
    ...currentDigest,
    decision: input.decision,
    decidedBy: input.decidedBy,
    decidedAt,
  }

  const currentBundle = state.bundles[bundleIndex]
  const updatedBundle: Bundle = {
    ...currentBundle,
    status: input.decision === 'approved' ? 'digested' : 'rejected',
    digestedAt: input.decision === 'approved' ? decidedAt : currentBundle.digestedAt,
  }

  const decisionEvent: Event = {
    id: nextId('evt'),
    recipeId: currentDigest.recipeId,
    bundleId: currentDigest.bundleId,
    taskId: null,
    type: input.decision === 'approved' ? 'digest_approved' : 'digest_rejected',
    actorId: input.decidedBy,
    actorType: 'human',
    body: input.note?.trim()
      ? `Digest ${input.decision}. ${input.note.trim()}`
      : `Digest ${input.decision}.`,
    facts: [],
    codeRefs: [],
    createdAt: decidedAt,
    expiresAt: null,
  }

  state.digests[digestIndex] = updatedDigest
  state.bundles[bundleIndex] = updatedBundle
  state.events.unshift(decisionEvent)
  writeState(state)

  publishRecipeStream(currentDigest.recipeId, 'bundle.decision', {
    bundleId: currentDigest.bundleId,
    decision: input.decision,
  })

  return clone(updatedDigest)
}

export function rerunBundleInDemo(input: {
  bundleId: string
}): BundleWithDetails | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)
  if (bundleIndex < 0) {
    return null
  }

  const blockedTasks = state.tasks.filter(
    (entry) => entry.bundleId === input.bundleId && entry.status === 'blocked'
  )
  if (blockedTasks.length === 0) {
    return null
  }

  const now = new Date().toISOString()
  state.bundles[bundleIndex] = {
    ...state.bundles[bundleIndex],
    status: 'open',
    blockedReason: null,
  }

  state.tasks = state.tasks.map((task) =>
    task.bundleId === input.bundleId && task.status === 'blocked'
      ? {
          ...task,
          status: 'open',
          claimedByAgentId: null,
          claimedAt: null,
          completedAt: null,
          blockedReason: null,
        }
      : task
  )

  const rerunEvent: Event = {
    id: nextId('evt'),
    recipeId: state.bundles[bundleIndex].recipeId,
    bundleId: input.bundleId,
    taskId: null,
    type: 'plan',
    actorId: 'system',
    actorType: 'system',
    body: `Re-run requested for ${blockedTasks.length} blocked task${
      blockedTasks.length === 1 ? '' : 's'
    }. Tasks reopened for reassignment.`,
    facts: [],
    codeRefs: [],
    createdAt: now,
    expiresAt: null,
  }

  state.events.unshift(rerunEvent)
  writeState(state)

  publishRecipeStream(state.bundles[bundleIndex].recipeId, 'task.updated', {
    bundleId: input.bundleId,
    taskId: blockedTasks[0].id,
    status: 'open',
  })

  return getBundleWithDetails(input.bundleId)
}

export function submitDigestInDemo(input: {
  bundleId: string
  submittedBy: string
  summary: string
  taskResults: Digest['taskResults']
  facts: Digest['facts']
  codeRefs: Digest['codeRefs']
}): Digest | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)

  if (bundleIndex < 0 || state.digests.some((entry) => entry.bundleId === input.bundleId)) {
    return null
  }

  const bundle = state.bundles[bundleIndex]
  const tasks = state.tasks.filter((entry) => entry.bundleId === input.bundleId)
  const allTerminal = tasks.every((task) =>
    ['done', 'blocked', 'cancelled'].includes(task.status)
  )

  if (!['cooked', 'blocked'].includes(bundle.status) || !allTerminal) {
    return null
  }

  const submittedAt = new Date().toISOString()
  const digest: Digest = {
    id: nextId('dig'),
    recipeId: bundle.recipeId,
    bundleId: bundle.id,
    summary: input.summary,
    taskResults: clone(input.taskResults),
    facts: clone(input.facts),
    codeRefs: clone(input.codeRefs),
    submittedBy: input.submittedBy,
    submittedAt,
    decision: 'pending',
    decidedBy: null,
    decidedAt: null,
  }

  const digestEvent: Event = {
    id: nextId('evt'),
    recipeId: bundle.recipeId,
    bundleId: bundle.id,
    taskId: null,
    type: 'digest_submitted',
    actorId: input.submittedBy,
    actorType: 'agent',
    body: `Digest submitted: ${input.summary.slice(0, 100)}`,
    facts: [],
    codeRefs: [],
    createdAt: submittedAt,
    expiresAt: null,
  }

  state.digests.unshift(digest)
  state.events.unshift(digestEvent)
  writeState(state)

  publishRecipeStream(bundle.recipeId, 'bundle.digest_submitted', {
    bundleId: bundle.id,
    digestId: digest.id,
  })

  return clone(digest)
}
