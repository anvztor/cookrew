/**
 * SandboxWindow — recipe-scoped popout opened by clicking the recipe
 * chip. Has two tabs:
 *
 *   - FILES: recipe metadata, branch, repo identifiers. The sandbox
 *     filesystem itself isn't yet exposed by an API, so the section
 *     surfaces "SANDBOX FS · pending API" honestly rather than mocking.
 *
 *   - RIGHTS: who can do what on this recipe. Humans rows derive from
 *     RecipeMember.role (owner / member). Agent rows derive from
 *     AgentPresence.capabilities.
 */
'use client'

import { useState } from 'react'
import type {
  AgentPresence,
  Recipe,
  RecipeMember,
} from '@cookrew/shared'

import { PopWindow } from './pop-window'

type SandboxTab = 'files' | 'rights'

const RIGHT_COLS = [
  { key: 'create_bundle', label: 'CREATE BUNDLE' },
  { key: 'cancel_bundle', label: 'CANCEL BUNDLE' },
  { key: 'submit_digest', label: 'SUBMIT DIGEST' },
  { key: 'approve_digest', label: 'APPROVE DIGEST' },
  { key: 'merge', label: 'MERGE' },
] as const

type RightKey = (typeof RIGHT_COLS)[number]['key']
type RightLevel = 'allow' | 'self' | 'deny'

const LEVEL_STYLE: Record<RightLevel, { bg: string; fg: string; label: string }> = {
  allow: { bg: 'var(--emerald-soft)', fg: 'var(--emerald-dim)', label: '✓' },
  self: { bg: 'var(--amber-cream)', fg: 'var(--amber-deep)', label: '◐' },
  deny: { bg: 'var(--cream-md)', fg: 'var(--muted)', label: '—' },
}

function rightForHuman(role: RecipeMember['role'], col: RightKey): RightLevel {
  if (role === 'owner') return 'allow'
  // members: can run/cancel their own work, can submit digests, can't approve/merge.
  if (col === 'create_bundle' || col === 'cancel_bundle' || col === 'submit_digest') {
    return col === 'cancel_bundle' ? 'self' : 'allow'
  }
  return 'deny'
}

function rightForAgent(_a: AgentPresence, col: RightKey): RightLevel {
  // Agents can autonomously claim/run/digest the work they're attached
  // to, but never approve or merge — that always escalates to a human.
  if (col === 'merge' || col === 'approve_digest') return 'deny'
  if (col === 'create_bundle') return 'deny' // only humans seed work
  return 'allow'
}

export function SandboxWindow({
  recipe,
  members,
  agents,
  onClose,
}: {
  recipe: Recipe | null
  members: readonly RecipeMember[]
  agents: readonly AgentPresence[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<SandboxTab>('files')

  const tabs: ReadonlyArray<{ k: SandboxTab; l: string }> = [
    { k: 'files', l: 'FILES' },
    { k: 'rights', l: 'RIGHTS' },
  ]

  return (
    <PopWindow
      id="sandbox"
      title={recipe ? `▶ RECIPE · ${recipe.name.toUpperCase()}` : '▶ RECIPE'}
      subtitle={recipe?.default_branch ?? undefined}
      accent="amber"
      initialX={120}
      initialY={70}
      width={720}
      height={520}
      onClose={onClose}
      z={50}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 1,
            borderBottom: '2px solid var(--line)',
            background: 'var(--cream-md)',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setTab(t.k)
              }}
              style={{
                padding: '8px 14px',
                background: tab === t.k ? 'var(--cream-hi)' : 'transparent',
                border: 0,
                borderRight: '1px dashed var(--line-soft)',
                borderBottom: tab === t.k ? '2px solid var(--amber-deep)' : '2px solid transparent',
                marginBottom: -2,
                fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
                fontSize: 9,
                letterSpacing: 0.5,
                color: tab === t.k ? 'var(--ink)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'files' ? (
          <FilesTab recipe={recipe} members={members} />
        ) : (
          <RightsTab members={members} agents={agents} />
        )}
      </div>
    </PopWindow>
  )
}

function FilesTab({
  recipe,
  members,
}: {
  recipe: Recipe | null
  members: readonly RecipeMember[]
}) {
  return (
    <div
      style={{
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 12,
        color: 'var(--ink)',
      }}
    >
      <Section title="▸ RECIPE">
        {recipe ? (
          <Definition rows={[
            ['name', recipe.name],
            ['id', recipe.id],
            ['cookbook', recipe.cookbook_id],
            ['repo', recipe.repo_url ?? '—'],
            ['branch', recipe.default_branch ?? '—'],
            ['created_by', recipe.created_by ?? '—'],
          ]} />
        ) : (
          <Empty msg="recipe metadata not loaded" />
        )}
      </Section>

      <Section title="▸ MEMBERS">
        {members.length === 0 ? (
          <Empty msg="no members" />
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map((m) => (
              <li key={`${m.actor_type}:${m.actor_id}`} style={{ display: 'flex', gap: 8 }}>
                <span className="pc-chip slate" style={{ fontSize: 8 }}>{m.actor_type}</span>
                <span style={{ fontWeight: 600 }}>{m.actor_id}</span>
                <span style={{ color: 'var(--muted)' }}>· {m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="▸ SANDBOX FS">
        <div
          style={{
            padding: 12,
            border: '1.5px dashed var(--line-soft)',
            background: 'var(--cream-md)',
            color: 'var(--muted)',
            fontSize: 11,
          }}
        >
          Filesystem listing not yet exposed by API. Coming when krewhub
          surfaces sandbox snapshots per bundle.
        </div>
      </Section>
    </div>
  )
}

function RightsTab({
  members,
  agents,
}: {
  members: readonly RecipeMember[]
  agents: readonly AgentPresence[]
}) {
  const humanRows = members.filter((m) => m.actor_type === 'human')

  return (
    <div
      style={{
        padding: 14,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--ink)',
        overflow: 'auto',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          border: '2px solid var(--line)',
          background: 'var(--cream-hi)',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                left: 0,
                background: 'var(--cream-md)',
                borderBottom: '2px solid var(--line)',
                borderRight: '2px solid var(--line)',
                padding: '8px 10px',
                textAlign: 'left',
                fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
                fontSize: 9,
                letterSpacing: 0.5,
              }}
            >
              PRINCIPAL
            </th>
            {RIGHT_COLS.map((c) => (
              <th
                key={c.key}
                style={{
                  background: 'var(--cream-md)',
                  borderBottom: '2px solid var(--line)',
                  padding: '8px 6px',
                  fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
                  fontSize: 8,
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {humanRows.length === 0 && agents.length === 0 && (
            <tr>
              <td colSpan={1 + RIGHT_COLS.length} style={{ padding: 18, color: 'var(--muted)', textAlign: 'center' }}>
                No principals on this recipe yet.
              </td>
            </tr>
          )}
          {humanRows.map((m) => (
            <tr key={`h:${m.actor_id}`}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'var(--cream-hi)',
                  borderRight: '2px solid var(--line)',
                  borderBottom: '1px dashed var(--line-soft)',
                  padding: '6px 10px',
                }}
              >
                <span className="pc-chip amber" style={{ fontSize: 7, marginRight: 6 }}>HUMAN</span>
                <b>{m.actor_id}</b>
                <span style={{ color: 'var(--muted)', marginLeft: 6 }}>· {m.role}</span>
              </td>
              {RIGHT_COLS.map((c) => (
                <RightCell key={c.key} level={rightForHuman(m.role, c.key)} />
              ))}
            </tr>
          ))}
          {agents.map((a) => (
            <tr key={`a:${a.agent_id}`}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'var(--cream-hi)',
                  borderRight: '2px solid var(--line)',
                  borderBottom: '1px dashed var(--line-soft)',
                  padding: '6px 10px',
                }}
              >
                <span className="pc-chip phos" style={{ fontSize: 7, marginRight: 6 }}>AGENT</span>
                <b>{a.agent_id.split('@')[0]}</b>
                <span style={{ color: 'var(--muted)', marginLeft: 6 }}>· {a.display_name}</span>
              </td>
              {RIGHT_COLS.map((c) => (
                <RightCell key={c.key} level={rightForAgent(a, c.key)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 14,
          fontSize: 10,
          color: 'var(--muted)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        <span><b style={{ color: 'var(--emerald-dim)' }}>✓</b> ALLOW</span>
        <span><b style={{ color: 'var(--amber-deep)' }}>◐</b> SELF-OWNED ONLY</span>
        <span><b style={{ color: 'var(--muted)' }}>—</b> DENY</span>
      </div>
    </div>
  )
}

function RightCell({ level }: { level: RightLevel }) {
  const s = LEVEL_STYLE[level]
  return (
    <td
      style={{
        textAlign: 'center',
        borderBottom: '1px dashed var(--line-soft)',
        padding: 0,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 26,
          padding: '4px 6px',
          background: s.bg,
          color: s.fg,
          fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
          fontSize: 10,
          border: '1px solid var(--line-soft)',
        }}
      >
        {s.label}
      </span>
    </td>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="pc-silk"
        style={{
          fontSize: 9,
          color: 'var(--muted)',
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Definition({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl
      style={{
        margin: 0,
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        rowGap: 4,
        fontSize: 11,
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt style={{ color: 'var(--muted)' }}>{k}</dt>
          <dd style={{ margin: 0, color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: 12,
        border: '1.5px dashed var(--line-soft)',
        background: 'var(--cream-md)',
        color: 'var(--muted)',
        fontSize: 11,
      }}
    >
      {msg}
    </div>
  )
}
