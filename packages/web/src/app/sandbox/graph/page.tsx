'use client'

/**
 * Phase-0 spike: render one bundle's tasks as a ReactFlow DAG.
 *
 * Throwaway sandbox at /sandbox/graph?recipe=<id>&bundle=<id>. Fetches
 * the live /workspace API, builds nodes from `bundle.tasks`, edges from
 * `task.depends_on_task_ids`, lays out top-to-bottom with dagre, and
 * renders via @xyflow/react. Validates that ReactFlow + dagre work
 * against real prod data before integrating into the feed.
 *
 * Decisions baked in (per design discussion):
 *   - top-to-bottom layout
 *   - plain edges (no labels)
 *   - background color encodes status
 *   - compact node shape (proxy for what TaskNode will eventually be)
 */

import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'

import '@xyflow/react/dist/style.css'

// ─────────────────────────────────────────────────────────────────
// Types — local to the sandbox; promoted to shared in Phase 1.
// ─────────────────────────────────────────────────────────────────

interface SandboxTask {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly depends_on_task_ids: readonly string[] | null
  readonly claimed_by_agent_id: string | null
}

interface WorkspaceResponse {
  readonly selected_bundle?: {
    readonly bundle: { readonly id: string }
    readonly tasks: readonly SandboxTask[]
  } | null
}

// ─────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

function layoutTopDown(
  tasks: readonly SandboxTask[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 60 })

  for (const t of tasks) {
    g.setNode(t.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  const taskIds = new Set(tasks.map((t) => t.id))
  for (const t of tasks) {
    for (const parent of t.depends_on_task_ids ?? []) {
      // Skip dangling deps so dagre doesn't synthesize phantom nodes.
      if (taskIds.has(parent)) g.setEdge(parent, t.id)
    }
  }

  dagre.layout(g)

  const nodes: Node[] = tasks.map((t) => {
    const pos = g.node(t.id)
    return {
      id: t.id,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { task: t },
      type: 'taskNode',
    }
  })

  const edges: Edge[] = []
  for (const t of tasks) {
    for (const parent of t.depends_on_task_ids ?? []) {
      if (taskIds.has(parent)) {
        edges.push({
          id: `${parent}->${t.id}`,
          source: parent,
          target: t.id,
          type: 'default',
        })
      }
    }
  }

  return { nodes, edges }
}

// ─────────────────────────────────────────────────────────────────
// Compact TaskNode — proxy for the real component coming in Phase 1.
// ─────────────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  done: '#D1FAE5',       // emerald-100
  working: '#DBEAFE',    // blue-100
  claimed: '#DBEAFE',    // blue-100
  blocked: '#FEE2E2',    // rose-100
  cancelled: '#FEE2E2',  // rose-100
  open: '#FAF5E8',       // cream
}

function TaskNodeProxy({ data }: { data: { task: SandboxTask } }) {
  const t = data.task
  const bg = STATUS_BG[t.status] ?? '#FFFEF5'
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: bg,
        border: '1px solid #2D2A20',
        boxShadow: '2px 2px 0 #2D2A20',
        padding: '8px 10px',
        fontFamily: 'ui-sans-serif, system-ui',
        fontSize: 12,
        color: '#2D2A20',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'relative',
      }}
    >
      {/* Top handle: receives edges from upstream tasks. Bottom: outgoing.
          Without handles ReactFlow silently drops edges to/from this node. */}
      <Handle type="target" position={Position.Top} style={{ background: '#2D2A20', width: 6, height: 6, border: 'none' }} />
      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {t.title}
      </div>
      <div style={{ fontSize: 10, color: '#57534E' }}>
        {t.status} {t.claimed_by_agent_id ? `· ${t.claimed_by_agent_id}` : ''}
      </div>
      <div style={{ fontSize: 9, color: '#A8A29E', fontFamily: 'ui-monospace, monospace' }}>
        {t.id}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#2D2A20', width: 6, height: 6, border: 'none' }} />
    </div>
  )
}

const nodeTypes = { taskNode: TaskNodeProxy }

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function GraphSandboxPage() {
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [bundleId, setBundleId] = useState<string | null>(null)
  const [data, setData] = useState<WorkspaceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRecipeId(params.get('recipe'))
    setBundleId(params.get('bundle'))
  }, [])

  useEffect(() => {
    if (!recipeId) return
    const url = bundleId
      ? `/api/v1/recipes/${recipeId}/workspace?bundle_id=${bundleId}`
      : `/api/v1/recipes/${recipeId}/workspace`
    fetch(url, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<WorkspaceResponse>
      })
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [recipeId, bundleId])

  const tasks = data?.selected_bundle?.tasks ?? []
  const { nodes, edges } = useMemo(() => layoutTopDown(tasks), [tasks])

  if (!recipeId) {
    return (
      <div style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Graph sandbox</h1>
        <p style={{ fontSize: 13, color: '#57534E' }}>
          Pass <code>?recipe=&lt;id&gt;&amp;bundle=&lt;id&gt;</code> in the URL.
        </p>
        <p style={{ fontSize: 13, color: '#57534E', marginTop: 8 }}>
          Try:{' '}
          <a
            href="/sandbox/graph?recipe=rec_70997c70&bundle=bun_21b93226"
            style={{ color: '#3B82F6', textDecoration: 'underline' }}
          >
            rec_70997c70 / bun_21b93226
          </a>
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#DC2626' }}>
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (!data) return <div style={{ padding: 24 }}>Loading…</div>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2D2A20',
          background: '#FAF5E8',
          fontFamily: 'ui-sans-serif, system-ui',
          fontSize: 13,
        }}
      >
        <strong>Graph sandbox</strong>
        {' · '}
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{recipeId}</span>
        {' / '}
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{bundleId}</span>
        {' · '}
        <span style={{ color: '#57534E' }}>
          {tasks.length} task{tasks.length === 1 ? '' : 's'}, {edges.length} edge
          {edges.length === 1 ? '' : 's'}
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
