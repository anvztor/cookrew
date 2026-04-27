/**
 * mapping.ts — convert cookrew domain types into arcade view models.
 *
 * Keeps the component layer pure (it only reads view models) so the
 * Pip-Boy vocabulary (party / quest / ops / pip-boy-line) stays
 * cleanly separated from the krewhub data model.
 */
import type {
  AgentPresence,
  Bundle,
  Event,
  EventPayload,
  RecipeMember,
  Task,
  TaskStatus,
} from '@cookrew/shared'
import type { TaskLiveState } from '@/hooks/use-task-stream'

// ── Party members (sidebar) ────────────────────────────

export type PartyKind = 'human' | 'agent'
export type PartyStatus = 'on' | 'off' | 'busy'

export interface PartyMember {
  readonly id: string
  readonly kind: PartyKind
  readonly name: string
  readonly role: string
  readonly sprite: string
  readonly status: PartyStatus
  readonly hp: number
  readonly hpMax: number
  readonly mp: number | null
  readonly mpMax: number | null
  /** 7d remaining-token window (long-burn budget). null = unknown. */
  readonly tok7d: number | null
  readonly tok7dMax: number | null
  /** 5h remaining-token window (short rate-limit horizon). null = unknown. */
  readonly tok5h: number | null
  readonly tok5hMax: number | null
  /**
   * Crew id (== owner_username for agents, == actor_id for humans).
   * Members of the same crew share a colored left-edge band in the
   * sidebar and highlight together on hover. null = unowned.
   */
  readonly crew: string | null
  /** Human-readable class label for the row (e.g. "AGENT · 4 CAPS"). */
  readonly className: string
  readonly detail: string
  /** Task this agent is currently claiming (null for humans / idle). */
  readonly taskId: string | null
  readonly tools: readonly string[]
}

const AGENT_SPRITES = ['agent_a', 'agent_b', 'agent_c', 'agent_d', 'agent_e'] as const

/**
 * Deterministic sprite picker — same agent_id always gets the same
 * sprite, so the roster is stable across refreshes.
 */
function pickAgentSprite(agentId: string): string {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) | 0
  }
  return AGENT_SPRITES[Math.abs(hash) % AGENT_SPRITES.length]
}

function formatAgentName(raw: string): string {
  // agent_id is usually "claude@anvztor" — uppercase the short name.
  const short = raw.split('@')[0] || raw
  return short.toUpperCase()
}

function formatAgentRole(agent: AgentPresence): string {
  // Use display_name as the role label ("Claude Agent" → "CLAUDE-AGENT").
  return agent.display_name.toUpperCase().replace(/\s+/g, '-')
}

function agentPartyStatus(agent: AgentPresence): PartyStatus {
  if (agent.status === 'busy') return 'busy'
  if (agent.status === 'offline') return 'off'
  return 'on'
}

function agentDetail(agent: AgentPresence): string {
  if (agent.status === 'offline') return 'offline'
  if (agent.current_task_id) return `On quest · ${agent.current_task_id.slice(0, 10)}`
  return 'Idle · awaiting claim'
}

/** Humans from RecipeMember rows. */
export function humansToPartyMembers(members: readonly RecipeMember[]): PartyMember[] {
  return members
    .filter((m) => m.actor_type === 'human')
    .map((m) => ({
      id: m.actor_id,
      kind: 'human' as const,
      name: initialsToName(m.actor_id),
      role: m.role.toUpperCase(),
      sprite: 'human',
      status: 'on' as const,
      hp: 100,
      hpMax: 100,
      mp: null,
      mpMax: null,
      tok7d: null,
      tok7dMax: null,
      tok5h: null,
      tok5hMax: null,
      crew: m.actor_id,
      className: `HUMAN · ${m.role.toUpperCase()}`,
      detail: m.role === 'owner' ? 'Recipe owner' : 'Operator',
      taskId: null,
      tools: [],
    }))
}

function initialsToName(actorId: string): string {
  // Keep it short — uppercase first segment before any @ / _.
  const cleaned = actorId.split('@')[0].split('_')[0]
  return cleaned.toUpperCase().slice(0, 12)
}

/**
 * HP represents heartbeat vitality — derived from how recently the
 * agent's heartbeat landed. Ranges 0-100, where 100 = heartbeat in
 * the last HEARTBEAT_FRESH_MS, and 0 = stale / offline.
 *
 * We could read this from server-side presence staleness fields, but
 * at the moment the client has `last_heartbeat_at` and can compute it
 * directly. No mocking — if the row has no heartbeat, HP is 0.
 */
const HEARTBEAT_FRESH_MS = 30_000
const HEARTBEAT_DEAD_MS = 90_000

function agentHeartbeatHp(agent: AgentPresence): number {
  if (agent.status === 'offline') return 0
  try {
    const then = new Date(agent.last_heartbeat_at).getTime()
    if (!Number.isFinite(then)) return 0
    const age = Math.max(0, Date.now() - then)
    if (age <= HEARTBEAT_FRESH_MS) return 100
    if (age >= HEARTBEAT_DEAD_MS) return 0
    // Linear decay between fresh and dead.
    const range = HEARTBEAT_DEAD_MS - HEARTBEAT_FRESH_MS
    return Math.max(0, Math.round(100 - ((age - HEARTBEAT_FRESH_MS) / range) * 100))
  } catch {
    return 0
  }
}

/** Agents from AgentPresence rows. */
export function agentsToPartyMembers(
  agents: readonly AgentPresence[],
): PartyMember[] {
  return agents.map((a) => {
    const status = agentPartyStatus(a)
    const hp = agentHeartbeatHp(a)
    // MP represents the agent's remaining context-window budget. We
    // don't surface that yet in AgentPresence, so report it as unknown.
    // The sidebar hides the MP bar entirely when mp === null.
    const mp: number | null = null
    const mpMax: number | null = null
    return {
      id: a.agent_id,
      kind: 'agent' as const,
      name: formatAgentName(a.agent_id),
      role: formatAgentRole(a),
      sprite: pickAgentSprite(a.agent_id),
      status,
      hp,
      hpMax: 100,
      mp,
      mpMax,
      // Token usage isn't yet exposed by AgentPresence — render as
      // unknown (—/—). When backend lands those fields, wire them here.
      tok7d: null,
      tok7dMax: null,
      tok5h: null,
      tok5hMax: null,
      crew: a.owner_username,
      className: a.capabilities.length > 0
        ? `AGENT · ${a.capabilities.length} CAPS`
        : 'AGENT',
      detail: agentDetail(a),
      taskId: a.current_task_id ?? null,
      tools: a.capabilities.slice(0, 4),
    }
  })
}

// ── Quests (mission board) ─────────────────────────────

export type QuestStatus = 'done' | 'working' | 'claimed' | 'blocked' | 'locked' | 'open'

export interface Quest {
  readonly id: string
  readonly no: string
  readonly title: string
  readonly status: QuestStatus
  readonly assignee: string
  readonly role: string
  readonly deps: readonly string[]
  readonly blockedReason: string | null
  readonly col: number
  readonly row: number
  readonly progressPct: number
}

/** TaskStatus → QuestStatus with the "locked" synthesized state. */
function deriveQuestStatus(
  task: Task,
  liveState: TaskLiveState | null,
  tasksById: Readonly<Record<string, Task>>,
): QuestStatus {
  const base: TaskStatus = liveState?.status ?? task.status
  if (base === 'done') return 'done'
  if (base === 'working') return 'working'
  if (base === 'claimed') return 'claimed'
  if (base === 'blocked') return 'blocked'
  if (base === 'cancelled') return 'blocked'
  // open — but "locked" if any upstream dep isn't done yet.
  const lockedByDep = task.depends_on_task_ids.some((depId) => {
    const dep = tasksById[depId]
    return !dep || dep.status !== 'done'
  })
  return lockedByDep ? 'locked' : 'open'
}

function agentShortFromId(agentId: string | null): string {
  if (!agentId) return '—'
  return agentId.split('@')[0].toUpperCase()
}

/** Layout tasks onto a dependency-aware grid (col = depth, row = rank). */
export function tasksToQuests(
  tasks: readonly Task[],
  liveStates: Readonly<Record<string, TaskLiveState>>,
  agents: readonly AgentPresence[],
): Quest[] {
  if (tasks.length === 0) return []

  const tasksById = Object.fromEntries(tasks.map((t) => [t.id, t]))
  const agentsById = Object.fromEntries(agents.map((a) => [a.agent_id, a]))

  // Compute depth (longest path from a root) for each task.
  const depth: Record<string, number> = {}
  const visit = (id: string, stack: Set<string>): number => {
    if (depth[id] !== undefined) return depth[id]
    if (stack.has(id)) return 0
    stack.add(id)
    const t = tasksById[id]
    const deps = t?.depends_on_task_ids ?? []
    const d = deps.length === 0 ? 0 : Math.max(...deps.map((d) => visit(d, stack) + 1))
    stack.delete(id)
    depth[id] = d
    return d
  }
  tasks.forEach((t) => visit(t.id, new Set()))

  // Sort tasks into columns by depth, then assign row by stable order.
  const byCol: Record<number, Task[]> = {}
  tasks.forEach((t) => {
    const c = depth[t.id] ?? 0
    ;(byCol[c] ??= []).push(t)
  })

  const result: Quest[] = []
  Object.entries(byCol).forEach(([colStr, colTasks]) => {
    const col = Number(colStr)
    colTasks.forEach((t, row) => {
      const live = liveStates[t.id] ?? null
      const status = deriveQuestStatus(t, live, tasksById)
      const assignedAgentId = live?.agentId ?? t.claimed_by_agent_id ?? null
      const agent = assignedAgentId ? agentsById[assignedAgentId] : null
      const progressPct = live?.progress?.percent ?? null
      result.push({
        id: t.id,
        no: String(result.length + 1).padStart(2, '0'),
        title: t.title,
        status,
        assignee: agentShortFromId(assignedAgentId),
        role: agent?.display_name.toUpperCase() ?? 'UNCLAIMED',
        deps: t.depends_on_task_ids,
        blockedReason: t.blocked_reason,
        col,
        row,
        progressPct:
          progressPct != null
            ? Math.round(progressPct)
            : status === 'working'
              ? 40
              : status === 'done'
                ? 100
                : 0,
      })
    })
  })
  return result
}

// ── Pip-Boy lines (event feed) ─────────────────────────

export type PipBoyKind =
  | 'bundle'
  | 'claim'
  | 'tool'
  | 'think'
  | 'milestone'
  | 'fact'
  | 'code'
  | 'done'
  | 'warn'
  | 'prompt'
  | 'reply'

export interface PipBoyLine {
  readonly id: string
  readonly t: string
  readonly src: string
  readonly kind: PipBoyKind
  readonly msg: string
}

function eventKindToPipBoy(ev: Event): PipBoyKind {
  switch (ev.type) {
    case 'prompt':
      return 'prompt'
    case 'plan':
      return 'bundle'
    case 'task_claimed':
      return 'claim'
    case 'task_working':
      return 'claim'
    case 'milestone':
      return 'milestone'
    case 'fact_added':
      return 'fact'
    case 'code_pushed':
      return 'code'
    case 'digest_submitted':
    case 'digest_approved':
      return 'done'
    case 'digest_rejected':
      return 'warn'
    case 'session_start':
      return 'claim'
    case 'session_end':
      return 'done'
    case 'tool_use':
      return 'tool'
    case 'tool_result':
      return 'tool'
    case 'agent_reply':
      return 'reply'
    case 'thinking':
      return 'think'
    default:
      return 'bundle'
  }
}

function summarizeEvent(ev: Event): string {
  const p = ev.payload as EventPayload | null
  if (p) {
    if (p.kind === 'tool_use') {
      const input = p.input as Record<string, unknown> | null | undefined
      const primary =
        (input &&
          (input.command ??
            input.file_path ??
            input.path ??
            input.query ??
            input.description)) ||
        ''
      const hint = typeof primary === 'string' ? primary.split('\n')[0].slice(0, 60) : ''
      return `${p.tool_name}(${hint})`
    }
    if (p.kind === 'tool_result') {
      return p.is_error ? '→ error' : `→ ok · ${p.output.slice(0, 60).replace(/\s+/g, ' ')}`
    }
    if (p.kind === 'thinking') {
      return `… ${p.text.slice(0, 80)}`
    }
    if (p.kind === 'agent_reply') {
      return p.text.slice(0, 100)
    }
    if (p.kind === 'session_start') {
      return `▶ ${p.agent_name} · ${p.model ?? 'unknown'}`
    }
    if (p.kind === 'session_end') {
      return p.success ? `■ done · ${p.duration_ms ?? '?'}ms` : `■ fail · ${p.blocked_reason ?? 'error'}`
    }
  }
  return ev.body.slice(0, 120) || `[${ev.type}]`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  } catch {
    return iso.slice(11, 19)
  }
}

export function eventsToPipBoyLines(events: readonly Event[]): PipBoyLine[] {
  return events.map((ev) => ({
    id: ev.id,
    t: formatTime(ev.created_at),
    src: agentShortFromId(ev.actor_id),
    kind: eventKindToPipBoy(ev),
    msg: summarizeEvent(ev),
  }))
}

// ── Bundle → mission board title ───────────────────────

export interface MissionHeader {
  readonly bundleId: string | null
  readonly title: string
  readonly status: Bundle['status'] | 'none'
  readonly clearedCount: number
  readonly workingCount: number
  readonly blockedCount: number
  readonly totalCount: number
}

export function buildMissionHeader(
  bundle: Bundle | null,
  tasks: readonly Task[],
  liveStates: Readonly<Record<string, TaskLiveState>>,
): MissionHeader {
  const statusOf = (t: Task): TaskStatus => liveStates[t.id]?.status ?? t.status
  const cleared = tasks.filter((t) => statusOf(t) === 'done').length
  const working = tasks.filter(
    (t) => statusOf(t) === 'working' || statusOf(t) === 'claimed',
  ).length
  const blocked = tasks.filter(
    (t) => statusOf(t) === 'blocked' || statusOf(t) === 'cancelled',
  ).length
  return {
    bundleId: bundle?.id ?? null,
    title: bundle?.prompt ?? 'No bundle selected — seed one below',
    status: bundle?.status ?? 'none',
    clearedCount: cleared,
    workingCount: working,
    blockedCount: blocked,
    totalCount: tasks.length,
  }
}
