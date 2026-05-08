/**
 * Demo fixture — used when the workspace is loaded with `?demo=1`.
 * Lets the v3 Arcade shell render without a live krewhub backend so
 * the layout / drawer / mode-dial visuals can be reviewed locally.
 *
 * Pure data only — safe to ship; the demo bypass in `screen.tsx` is
 * gated by the `demo` query param.
 */
import type {
  AgentPresence,
  Bundle,
  Recipe,
  RecipeMember,
  Task,
  WorkspaceData,
} from '@cookrew/shared'

const RECIPE: Recipe = {
  id: 'r_demo',
  name: 'Heartbeat reliability sweep',
  repo_url: 'github.com/krew/heartbeat',
  default_branch: 'main',
  created_by: 'alex',
  created_at: '2026-04-26T00:00:00Z',
  cookbook_id: 'cb_demo',
}

const BUNDLE: Bundle = {
  id: 'bun_4a2c11',
  recipe_id: RECIPE.id,
  prompt: 'Heartbeat reliability sweep — repair the flaky retry path',
  status: 'open',
  created_by: 'alex',
  created_at: '2026-04-26T00:00:00Z',
  claimed_at: null,
  cooked_at: null,
  digested_at: null,
  blocked_reason: null,
  graph_code: null,
  graph_mermaid: null,
}

const MEMBERS: readonly RecipeMember[] = [
  {
    id: 'm_alex',
    recipe_id: RECIPE.id,
    actor_id: 'alex',
    actor_type: 'human',
    role: 'owner',
    joined_at: '2026-04-26T00:00:00Z',
  },
]

const mkAgent = (
  id: string,
  display: string,
  status: 'online' | 'busy' | 'offline',
): AgentPresence => ({
  agent_id: `${id}@krewcli`,
  cookbook_id: RECIPE.cookbook_id,
  display_name: display,
  capabilities: ['code', 'shell', 'fs'],
  status,
  last_heartbeat_at: '2026-04-26T00:00:00Z',
  current_task_id: null,
  owner_username: 'alex',
  mint_tx_hash: null,
  mint_token_id: null,
})

const AGENTS: readonly AgentPresence[] = [
  mkAgent('scout', 'Scout', 'busy'),
  mkAgent('gatekeeper', 'Gatekeeper', 'online'),
  mkAgent('brewer', 'Brewer', 'busy'),
  mkAgent('patcher', 'Patcher', 'offline'),
]

const mkTask = (
  id: string,
  title: string,
  status: Task['status'],
  deps: readonly string[],
  agentId: string | null,
): Task => ({
  id,
  bundle_id: BUNDLE.id,
  title,
  description: null,
  status,
  depends_on_task_ids: deps,
  claimed_by_agent_id: agentId,
  claimed_at: null,
  completed_at: null,
  blocked_reason: status === 'blocked' ? 'awaiting human' : null,
  graph_node_id: null,
})

const TASKS: readonly Task[] = [
  mkTask('t1', 'Add heartbeat endpoint', 'done', [], 'scout@krewcli'),
  mkTask('t2', 'Heartbeat retry on flaky DNS', 'blocked', ['t1'], 'scout@krewcli'),
  mkTask('t3', 'Sandbox reset script', 'working', ['t1'], 'brewer@krewcli'),
  mkTask('t4', 'Write replay smoke test', 'open', ['t2', 't3'], 'gatekeeper@krewcli'),
  mkTask('t5', 'Patch deserialization bug', 'open', ['t3'], 'patcher@krewcli'),
  mkTask('t6', 'Add chaos-monkey to CI', 'open', ['t4'], 'gatekeeper@krewcli'),
  mkTask('t7', 'Telemetry dashboard widget', 'open', ['t4', 't5'], 'brewer@krewcli'),
]

export const DEMO_WORKSPACE_DATA: WorkspaceData = {
  recipe: RECIPE,
  members: MEMBERS,
  agents: AGENTS,
  bundles: [BUNDLE],
  recent_digests: [],
  selected_bundle_id: BUNDLE.id,
  selected_bundle: {
    bundle: BUNDLE,
    tasks: TASKS,
    events: [],
    digest: null,
    fork_anchors: [],
  },
}
