'use client'

/**
 * Sandbox harness for the WorkflowGraphCard component (Phase 1+).
 *
 * Mounts the real WorkflowGraphCard against live /workspace data so we
 * can verify each phase visually before integrating into the event feed.
 *
 * Lives at /sandbox/graph?recipe=<id>&bundle=<id>. Click handlers log
 * to the on-screen action panel — no real cancel/rerun is invoked.
 */

import { useEffect, useState } from 'react'

import type { Bundle, Task } from '@cookrew/shared'

import {
  ActiveTaskPills,
  WorkflowGraphCard,
} from '@/components/workspace-screen/workflow-graph'
import { WorkflowFeedProvider } from '@/components/workspace-screen/workflow-feed-context'
import type { TaskLiveState } from '@/hooks/use-task-stream'
import { useTaskStream } from '@/hooks/use-task-stream'

interface WorkspaceResponse {
  readonly selected_bundle?: {
    readonly bundle: Bundle
    readonly tasks: readonly Task[]
  } | null
}

/**
 * Sandbox helper — fabricate working/claimed liveStates for the first
 * two tasks in a bundle so the ActiveTaskPills strip is observable even
 * on a fully-cooked bundle. The real workspace gets these from useTaskStream.
 */
function synthesizeWorkingStates(
  tasks: readonly Task[],
  realStates: Readonly<Record<string, TaskLiveState>>,
): Readonly<Record<string, TaskLiveState>> {
  const out: Record<string, TaskLiveState> = { ...realStates }
  const fakeStartedAt = new Date(Date.now() - 47_000).toISOString()
  tasks.slice(0, 2).forEach((t, i) => {
    if (out[t.id]) return // don't override real state
    out[t.id] = {
      taskId: t.id,
      agentId: i === 0 ? 'codex@anvztor' : 'claude@anvztor',
      status: i === 0 ? 'working' : 'claimed',
      title: t.title ?? null,
      bundleId: t.bundle_id,
      startedAt: fakeStartedAt,
      completedAt: null,
      progress: null,
      events: [],
      lastSeq: 0,
    }
  })
  return out
}

export default function GraphSandboxPage() {
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [bundleId, setBundleId] = useState<string | null>(null)
  const [data, setData] = useState<WorkspaceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<string[]>([])
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const liveStates = useTaskStream(recipeId, { bundleId: bundleId ?? undefined })

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

  const log = (msg: string) =>
    setActionLog((prev) => [`${new Date().toISOString().slice(11, 19)} ${msg}`, ...prev].slice(0, 20))

  const tasks = data?.selected_bundle?.tasks ?? []
  const bundle = data?.selected_bundle?.bundle

  if (!recipeId) {
    return (
      <div style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Workflow graph sandbox</h1>
        <p style={{ fontSize: 13, color: '#57534E' }}>
          Pass <code>?recipe=&lt;id&gt;&amp;bundle=&lt;id&gt;</code> in the URL.
        </p>
        <p style={{ fontSize: 13, color: '#57534E', marginTop: 8 }}>
          Try:{' '}
          <a
            href="/sandbox/graph?recipe=rec_70997c70&bundle=bun_21b93226"
            style={{ color: '#3B82F6', textDecoration: 'underline' }}
          >
            rec_70997c70 / bun_21b93226 (5 sequential tasks)
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
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        background: '#F5F5F4',
        fontFamily: 'ui-sans-serif, system-ui',
      }}
    >
      <main style={{ padding: 16 }}>
        <header style={{ marginBottom: 12, fontSize: 13, color: '#57534E' }}>
          <strong>WorkflowGraphCard</strong> · sandbox ·{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{recipeId}</span> /{' '}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{bundleId}</span>
        </header>

        {/* Phase 4 visualisation: synthesise 'working' liveStates for the
            first two tasks so the ActiveTaskPills strip is observable
            even on a completed bundle. Real workspace gets pills from
            real SSE-driven states. */}
        <WorkflowFeedProvider
          value={{
            bundle: bundle ?? null,
            tasks,
            liveStates: synthesizeWorkingStates(tasks, liveStates),
            expandedTaskId,
            onExpandTask: (id) => {
              setExpandedTaskId((prev) => (prev === id ? null : id))
              log(`expand ${id}`)
            },
            onCancelTask: (id) => log(`cancel ${id}`),
            onRerunTask: (id) => log(`rerun ${id}`),
          }}
        >
          <ActiveTaskPills />
        </WorkflowFeedProvider>

        <div style={{ marginTop: 12 }}>
          <WorkflowGraphCard
            tasks={tasks}
            liveStates={liveStates}
            bundleId={bundle?.id ?? bundleId ?? ''}
            bundlePrompt={bundle?.prompt ?? null}
            bundleStatus={bundle?.status ?? null}
            expandedTaskId={expandedTaskId}
            onExpandTask={(id) => {
              setExpandedTaskId((prev) => (prev === id ? null : id))
              log(`expand ${id}`)
            }}
            onCancelTask={(id) => log(`cancel ${id}`)}
            onRerunTask={(id) => log(`rerun ${id}`)}
            height={420}
          />
        </div>
      </main>

      <aside
        style={{
          padding: 16,
          background: '#FFFEF5',
          borderLeft: '1px solid #E7E5E4',
          fontSize: 12,
          overflow: 'auto',
        }}
      >
        <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#57534E' }}>
          State
        </h2>
        <dl style={{ marginTop: 8 }}>
          <dt style={{ color: '#57534E' }}>Tasks</dt>
          <dd style={{ marginLeft: 0 }}>{tasks.length}</dd>
          <dt style={{ color: '#57534E', marginTop: 4 }}>Live states</dt>
          <dd style={{ marginLeft: 0 }}>{Object.keys(liveStates).length}</dd>
          <dt style={{ color: '#57534E', marginTop: 4 }}>Expanded</dt>
          <dd style={{ marginLeft: 0, fontFamily: 'ui-monospace, monospace' }}>{expandedTaskId ?? '(none)'}</dd>
        </dl>

        <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#57534E', marginTop: 16 }}>
          Action log
        </h2>
        <ul style={{ marginTop: 8, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {actionLog.length === 0 ? (
            <li style={{ color: '#A8A29E' }}>(click a node, cancel, or rerun)</li>
          ) : (
            actionLog.map((entry, i) => (
              <li key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                {entry}
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  )
}
