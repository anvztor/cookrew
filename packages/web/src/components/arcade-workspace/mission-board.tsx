/**
 * MissionBoard — ReactFlow-powered bundle task DAG with pixel chrome.
 *
 * Uses @xyflow/react for pan/zoom/fit-view and @dagrejs/dagre for
 * automatic top-to-bottom layout. Nodes render as pushpin-and-cork
 * quest cards matching the arcade aesthetic. Edges are dashed "yarn"
 * lines colored by status (purple when active, amber on hover/highlight,
 * gray otherwise).
 */
'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import dagre from '@dagrejs/dagre'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { Quest, QuestStatus } from './mapping'

const NODE_WIDTH = 220
const NODE_HEIGHT = 150
const NODE_SEP = 42
const RANK_SEP = 68

const STATUS_STYLES: Record<
  QuestStatus,
  { bg: string; ink: string; pin: string; label: string; edge: string }
> = {
  done: { bg: '#D8F3E6', ink: '#0B4F2E', pin: '#059669', label: 'CLEARED', edge: '#7A6AAB' },
  working: { bg: '#FFF3AD', ink: '#5C4A1F', pin: '#D97706', label: 'IN PROGRESS', edge: '#D97706' },
  claimed: { bg: '#DBEAFE', ink: '#1E40AF', pin: '#3B82F6', label: 'CLAIMED', edge: '#3B82F6' },
  blocked: { bg: '#FEE2E2', ink: '#991B1B', pin: '#DC2626', label: 'BLOCKED', edge: '#DC2626' },
  locked: { bg: '#F5F0E8', ink: '#78716C', pin: '#A8A29E', label: 'LOCKED', edge: '#A8A29E' },
  open: { bg: '#FFFEF5', ink: '#2D2A20', pin: '#2D2A20', label: 'OPEN', edge: '#A8A29E' },
}

// ── Node payload ────────────────────────────────────────

// ReactFlow v12 requires node/edge data to be index-signature-compatible,
// so we declare these as type aliases rather than interfaces.
type QuestNodeData = {
  quest: Quest
  hl: boolean
  selected: boolean
  [key: string]: unknown
}

// ── Custom pixel node ───────────────────────────────────

function QuestNodeImpl({ data }: NodeProps<Node<QuestNodeData>>) {
  const { quest: t, hl, selected } = data
  const st = STATUS_STYLES[t.status]
  return (
    <div
      data-task-id={t.id}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: st.bg,
        border: '2px solid var(--line)',
        boxShadow: selected
          ? '3px 3px 0 var(--line), 0 0 0 3px var(--amber-deep)'
          : hl
            ? '3px 3px 0 var(--line), 0 0 0 3px var(--amber)'
            : '3px 3px 0 var(--line)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 80ms linear',
      }}
    >
      {/* Invisible handles for ReactFlow edges (top = in, bottom = out) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Pushpin */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: 14,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: st.pin,
          border: '2px solid var(--line)',
          boxShadow: '1px 1px 0 var(--line), inset 1px 1px 0 rgba(255,255,255,0.5)',
        }}
      />

      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="pc-silk" style={{ fontSize: 8, color: st.ink, opacity: 0.8 }}>
          QUEST #{t.no}
        </div>
        <div
          className="pc-chip"
          style={{
            background: st.pin,
            color: '#fff',
            borderColor: 'var(--line)',
            fontSize: 7,
          }}
        >
          {st.label}
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: st.ink,
          lineHeight: 1.2,
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
        title={t.title}
      >
        {t.title}
      </div>

      {/* Blocked reason — only surfaced when the task is actually
          blocked / cancelled. A lingering blocked_reason on a done task
          (krewhub sometimes leaves one after a timeout+recovery) would
          otherwise make a CLEARED card look scary. */}
      {t.blockedReason && (t.status === 'blocked' || t.status === 'locked') && (
        <div
          className="pc-mono"
          style={{
            fontSize: 9,
            color: st.ink,
            opacity: 0.85,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={t.blockedReason}
        >
          ⚠ {t.blockedReason}
        </div>
      )}

      {/* Progress bar when working */}
      {t.status === 'working' && (
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'rgba(0,0,0,0.1)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${t.progressPct}%`,
              background: st.pin,
              transition: 'width 300ms linear',
            }}
          />
        </div>
      )}

      {/* Footer — assignee + deps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 9,
          borderTop: '1px dashed var(--line)',
          paddingTop: 5,
        }}
      >
        <div
          className="pc-mono"
          style={{ color: st.ink, fontWeight: 600, fontSize: 10 }}
        >
          @{t.assignee}
        </div>
        <div className="pc-silk" style={{ fontSize: 8, color: st.ink }}>
          {t.deps.length > 0 ? `deps: ${t.deps.length}` : 'root'}
        </div>
      </div>
    </div>
  )
}

// Custom equality — `data.quest` is a new object on every SSE reload
// but its render-relevant fields usually haven't changed. Without this
// the status chips and borders flicker while tasks are live.
const QuestNode = memo(QuestNodeImpl, (prev, next) => {
  const a = prev.data.quest
  const b = next.data.quest
  return (
    prev.data.hl === next.data.hl &&
    prev.data.selected === next.data.selected &&
    a.id === b.id &&
    a.status === b.status &&
    a.title === b.title &&
    a.assignee === b.assignee &&
    a.no === b.no &&
    a.progressPct === b.progressPct &&
    a.blockedReason === b.blockedReason &&
    a.deps.length === b.deps.length
  )
})

// ── Custom pixel edge (dashed yarn) ─────────────────────

type YarnEdgeData = {
  active: boolean
  hl: boolean
  color: string
  [key: string]: unknown
}

function YarnEdgeImpl(props: EdgeProps<Edge<YarnEdgeData>>) {
  const { id, sourceX, sourceY, targetX, targetY, data } = props
  const mx = (sourceX + targetX) / 2
  const d = `M ${sourceX} ${sourceY} C ${mx} ${sourceY}, ${mx} ${targetY}, ${targetX} ${targetY}`
  const color = data?.hl ? '#D97706' : data?.active ? data.color : '#A8A29E'
  const dash = data?.active ? '6 3' : '3 3'
  const strokeWidth = data?.hl ? 3 : 2
  return (
    <g>
      <path
        id={id}
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={dash}
      />
      <polygon
        points={`${targetX},${targetY} ${targetX - 6},${targetY - 4} ${targetX - 6},${targetY + 4}`}
        fill={color}
      />
      <circle cx={sourceX} cy={sourceY} r={3} fill="#2D2A20" />
      <circle cx={targetX} cy={targetY} r={3} fill="#2D2A20" />
    </g>
  )
}

const YarnEdge = memo(YarnEdgeImpl, (prev, next) => {
  return (
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.data?.active === next.data?.active &&
    prev.data?.hl === next.data?.hl &&
    prev.data?.color === next.data?.color
  )
})

// ── Layout (dagre, memoized by deps signature) ──────────

function structuralSignature(quests: readonly Quest[]): string {
  return quests
    .map((q) => `${q.id}<-${q.deps.join(',')}`)
    .sort()
    .join('|')
}

function computeLayout(quests: readonly Quest[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  if (quests.length === 0) return out
  const ids = new Set(quests.map((q) => q.id))
  try {
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP })
    for (const q of quests) g.setNode(q.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    for (const q of quests) {
      for (const p of q.deps) if (ids.has(p)) g.setEdge(p, q.id)
    }
    dagre.layout(g)
    for (const q of quests) {
      const n = g.node(q.id)
      out.set(q.id, { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 })
    }
  } catch {
    quests.forEach((q, i) => out.set(q.id, { x: i * (NODE_WIDTH + NODE_SEP), y: 0 }))
  }
  return out
}

// ── Board (outer) ───────────────────────────────────────

const NODE_TYPES = { questNode: QuestNode }
const EDGE_TYPES = { yarn: YarnEdge }
const FIT_VIEW_OPTIONS = { padding: 0.2 }
const PRO_OPTIONS = { hideAttribution: true }
const FLOW_STYLE = { background: 'transparent' }
const BG_STYLE = { backgroundColor: 'transparent' }
const CONTROLS_STYLE = {
  border: '2px solid var(--line)',
  background: 'var(--cream-hi)',
  boxShadow: '3px 3px 0 var(--line)',
}

interface MissionBoardProps {
  quests: readonly Quest[]
  highlightedTask: string | null
  selectedTask?: string | null
  onHoverTask: (id: string | null) => void
  onSelectTask?: (t: Quest) => void
}

function MissionBoardInner({
  quests,
  highlightedTask,
  selectedTask,
  onHoverTask,
  onSelectTask,
}: MissionBoardProps) {
  const rf = useReactFlow()
  const sigRef = useRef('')

  const sig = useMemo(() => structuralSignature(quests), [quests])
  const positions = useMemo(() => computeLayout(quests), [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const nodes: Node<QuestNodeData>[] = useMemo(
    () =>
      quests.map((q) => ({
        id: q.id,
        type: 'questNode',
        position: positions.get(q.id) ?? { x: 0, y: 0 },
        data: {
          quest: q,
          hl: highlightedTask === q.id,
          selected: selectedTask === q.id,
        },
        draggable: false,
      })),
    [quests, positions, highlightedTask, selectedTask],
  )

  const edges: Edge<YarnEdgeData>[] = useMemo(() => {
    const ids = new Set(quests.map((q) => q.id))
    const out: Edge<YarnEdgeData>[] = []
    for (const q of quests) {
      for (const p of q.deps) {
        if (!ids.has(p)) continue
        const src = quests.find((x) => x.id === p)
        if (!src) continue
        const active = src.status === 'done' && q.status !== 'locked'
        const hl =
          highlightedTask === q.id ||
          highlightedTask === src.id ||
          selectedTask === q.id ||
          selectedTask === src.id
        out.push({
          id: `${p}->${q.id}`,
          source: p,
          target: q.id,
          type: 'yarn',
          data: {
            active,
            hl,
            color: STATUS_STYLES[q.status].edge,
          },
        })
      }
    }
    return out
  }, [quests, highlightedTask, selectedTask])

  // Fit view whenever the graph structure changes.
  useEffect(() => {
    if (sigRef.current !== sig && quests.length > 0) {
      sigRef.current = sig
      requestAnimationFrame(() => {
        try {
          rf.fitView({ padding: 0.2, duration: 240 })
        } catch {}
      })
    }
  }, [sig, quests.length, rf])

  const onNodeClick = useCallback(
    (_e: unknown, node: Node<QuestNodeData>) => onSelectTask?.(node.data.quest),
    [onSelectTask],
  )
  const onNodeMouseEnter = useCallback(
    (_e: unknown, node: Node<QuestNodeData>) => onHoverTask(node.data.quest.id),
    [onHoverTask],
  )
  const onNodeMouseLeave = useCallback(() => onHoverTask(null), [onHoverTask])

  if (quests.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: 'var(--muted)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        <div
          className="pc-silk"
          style={{ fontSize: 12, marginBottom: 8, color: 'var(--ink-soft)' }}
        >
          ▸ NO QUESTS YET
        </div>
        <div style={{ fontSize: 12 }}>
          Seed a bundle below with a prompt and the planner will decompose it into quests.
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.4}
        maxZoom={1.8}
        proOptions={PRO_OPTIONS}
        panOnScroll
        nodesDraggable={false}
        nodesConnectable={false}
        selectionOnDrag={false}
        zoomOnDoubleClick={false}
        style={FLOW_STYLE}
      >
        <Background
          gap={24}
          size={1}
          color="var(--cream-md)"
          style={BG_STYLE}
        />
        <Controls showInteractive={false} style={CONTROLS_STYLE} />
      </ReactFlow>
    </div>
  )
}

export function MissionBoard(props: MissionBoardProps) {
  return (
    <ReactFlowProvider>
      <MissionBoardInner {...props} />
    </ReactFlowProvider>
  )
}
