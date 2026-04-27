/**
 * ArcadeSidebar — Tamagotchi party roster.
 *
 * Shows humans (operators) + agents with HP (heartbeat vitality) and
 * MP (context-window budget) bars. Collapsible to an icon strip.
 */
'use client'

import { useMemo } from 'react'
import { LED, PixelBtn, Sprite16, PORTRAITS } from './pixel-chrome'
import { TokBar } from './tok-bar'
import { crewColorFor, type CrewColor } from './crew'
import type { PartyMember } from './mapping'

function PartyRow({
  m,
  collapsed,
  onHover,
  active,
  hl,
  onClick,
  crew,
  crewHl,
  dimmed,
  crewAgentCount,
}: {
  m: PartyMember
  collapsed: boolean
  onHover?: (id: string | null) => void
  active?: boolean
  hl?: boolean
  onClick?: (m: PartyMember) => void
  crew: CrewColor | null
  /** Whether this row's crew matches the currently-hovered crew. */
  crewHl: boolean
  /** Whether to dim this row (a different crew is hovered). */
  dimmed: boolean
  /** Number of agents in this human's crew (only used for human rows). */
  crewAgentCount: number
}) {
  const portrait = PORTRAITS[m.sprite] ?? PORTRAITS.human
  const crewBand = crew?.color ?? 'transparent'
  const crewBandWidth = crew ? (collapsed ? 3 : 4) : 0
  const baseBg = crewHl
    ? crew?.soft ?? 'transparent'
    : hl
      ? 'var(--amber-soft)'
      : active
        ? 'var(--amber-cream)'
        : 'transparent'
  const dimOpacity = dimmed ? 0.32 : 1

  if (collapsed) {
    return (
      <div
        data-agent-id={m.id}
        onMouseEnter={() => onHover?.(m.id)}
        onMouseLeave={() => onHover?.(null)}
        onClick={() => onClick?.(m)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: 4,
          cursor: 'pointer',
          borderLeft: crewBandWidth ? `${crewBandWidth}px solid ${crewBand}` : undefined,
          borderTop: active ? '2px solid var(--amber-deep)' : '2px solid transparent',
          borderRight: active ? '2px solid var(--amber-deep)' : '2px solid transparent',
          borderBottom: active ? '2px solid var(--amber-deep)' : '2px solid transparent',
          background: baseBg,
          opacity: dimOpacity,
          transition: 'background 120ms, opacity 120ms',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Sprite16 art={portrait} size={32} bg={m.status === 'off' ? '#444' : '#FFFEF5'} />
          <div style={{ position: 'absolute', top: -3, right: -3 }}>
            <LED state={m.status} />
          </div>
        </div>
        <div className="pc-silk" style={{ fontSize: 7, color: 'var(--ink)' }}>
          {m.name.slice(0, 5)}
        </div>
        {m.kind === 'agent' && (() => {
          // Mini-bar shows 5h remaining (drains MP-style) when known.
          // No data → muted grey strip so the row stays the same height.
          const hasTok = m.tok5h !== null && m.tok5hMax !== null && m.tok5hMax > 0
          const remPct = hasTok ? Math.max(0, 1 - m.tok5h / m.tok5hMax) : 0
          const critical = hasTok && remPct <= 0.1
          return (
            <div
              style={{
                width: 30,
                height: 4,
                background: 'var(--cream-md)',
                border: '1px solid var(--line)',
              }}
            >
              {hasTok && (
                <div
                  style={{
                    height: '100%',
                    width: `${remPct * 100}%`,
                    background: critical ? 'var(--rose)' : 'var(--mp)',
                  }}
                />
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div
      data-agent-id={m.id}
      onMouseEnter={() => onHover?.(m.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(m)}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        gap: 10,
        padding: '10px 10px 10px 14px',
        cursor: 'pointer',
        borderLeft: crewBandWidth ? `${crewBandWidth}px solid ${crewBand}` : undefined,
        borderTop: active ? '2px solid var(--amber-deep)' : '2px solid transparent',
        borderRight: active ? '2px solid var(--amber-deep)' : '2px solid transparent',
        borderBottom: active
          ? '2px solid var(--amber-deep)'
          : '1px dashed var(--line-soft)',
        background: baseBg,
        opacity: dimOpacity,
        transition: 'background 120ms, opacity 120ms',
      }}
    >
      <div style={{ position: 'relative' }}>
        <Sprite16 art={portrait} size={40} bg={m.status === 'off' ? '#555' : '#FFFEF5'} />
        <div style={{ position: 'absolute', top: -3, right: -3 }}>
          <LED state={m.status} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            justifyContent: 'space-between',
          }}
        >
          <div className="pc-silk" style={{ fontSize: 11, color: 'var(--ink)' }}>
            {m.name}
          </div>
          <div className="pc-silk" style={{ fontSize: 7, color: 'var(--muted)' }}>
            {m.className.split('·')[1]?.trim() ?? ''}
          </div>
        </div>
        <div
          className="pc-mono"
          style={{
            fontSize: 9,
            color: 'var(--muted)',
            marginTop: 1,
            marginBottom: 5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {m.role} — {m.detail}
        </div>
        {m.kind === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TokBar
              window="7d"
              used={m.tok7d}
              max={m.tok7dMax}
              hot={
                m.tok7d !== null && m.tok7dMax !== null && m.tok7dMax > 0
                  ? 1 - m.tok7d / m.tok7dMax <= 0.1
                  : false
              }
            />
            <TokBar
              window="5h"
              used={m.tok5h}
              max={m.tok5hMax}
              hot={
                m.tok5h !== null && m.tok5hMax !== null && m.tok5hMax > 0
                  ? 1 - m.tok5h / m.tok5hMax <= 0.1
                  : false
              }
            />
          </div>
        )}
        {m.kind === 'human' && (
          <div
            className="pc-chip"
            style={{
              fontSize: 8,
              background: crew?.color ?? 'var(--amber)',
              color: '#1A140C',
              border: '1px solid var(--line)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ★ {crewAgentCount > 0 ? `LEADS ${crewAgentCount} AGENT${crewAgentCount === 1 ? '' : 'S'}` : 'OPERATOR'}
          </div>
        )}
      </div>
    </div>
  )
}

export function ArcadeSidebar({
  humans,
  agents,
  collapsed,
  onToggleCollapse,
  onHoverAgent,
  highlightedAgent,
  activeAgent,
  onSelectAgent,
}: {
  humans: readonly PartyMember[]
  agents: readonly PartyMember[]
  collapsed: boolean
  onToggleCollapse: () => void
  onHoverAgent: (id: string | null) => void
  highlightedAgent: string | null
  activeAgent: string | null
  onSelectAgent: (m: PartyMember) => void
}) {
  const online = agents.filter((a) => a.status !== 'off').length
  const total = agents.length

  // Crew indexing — derive once per agent/human change.
  const partyById = useMemo(() => {
    const map = new Map<string, PartyMember>()
    for (const h of humans) map.set(h.id, h)
    for (const a of agents) map.set(a.id, a)
    return map
  }, [humans, agents])

  const hoveredCrew = useMemo<string | null>(() => {
    if (!highlightedAgent) return null
    return partyById.get(highlightedAgent)?.crew ?? null
  }, [highlightedAgent, partyById])

  const agentsPerCrew = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of agents) {
      if (!a.crew) continue
      counts.set(a.crew, (counts.get(a.crew) ?? 0) + 1)
    }
    return counts
  }, [agents])

  const sortedAgents = useMemo(() => {
    // Cluster agents by crew so the same operator's agents sit together.
    return [...agents].sort((a, b) => {
      const ca = a.crew ?? '~'
      const cb = b.crew ?? '~'
      if (ca === cb) return 0
      return ca < cb ? -1 : 1
    })
  }, [agents])

  const rowProps = (m: PartyMember) => ({
    crew: crewColorFor(m.crew),
    crewHl: hoveredCrew !== null && m.crew === hoveredCrew,
    dimmed: hoveredCrew !== null && m.crew !== hoveredCrew,
    crewAgentCount: m.kind === 'human' && m.crew ? agentsPerCrew.get(m.crew) ?? 0 : 0,
  })

  return (
    <aside
      style={{
        width: collapsed ? 72 : 260,
        borderRight: '2px solid var(--line)',
        background: 'var(--cream-hi)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        transition: 'width 180ms ease',
        flexShrink: 0,
      }}
    >
      {/* Cartridge label header */}
      <div
        style={{
          padding: collapsed ? '10px 6px' : '12px 14px',
          borderBottom: '2px solid var(--line)',
          background: 'var(--amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}
      >
        {!collapsed && (
          <div>
            <div
              className="pc-silk"
              style={{ fontSize: 9, color: 'var(--ink-soft)', letterSpacing: 1.4 }}
            >
              PARTY · {online}/{total} ONLINE
            </div>
            <div className="pc-display" style={{ fontSize: 11, marginTop: 4, color: 'var(--ink)' }}>
              THE KREW
            </div>
          </div>
        )}
        <PixelBtn size="tiny" onClick={onToggleCollapse} style={{ padding: '4px 6px', minWidth: 24 }}>
          {collapsed ? '▶' : '◀'}
        </PixelBtn>
      </div>

      {/* Humans section */}
      {!collapsed && humans.length > 0 && (
        <div style={{ padding: '8px 14px 4px', background: 'var(--cream-md)' }}>
          <div className="pc-kicker">▸ OPERATORS</div>
        </div>
      )}
      <div
        style={{
          display: collapsed ? 'flex' : 'block',
          flexWrap: 'wrap',
          padding: collapsed ? 4 : 0,
          justifyContent: 'center',
          gap: collapsed ? 2 : 0,
        }}
      >
        {humans.map((m) => (
          <PartyRow
            key={m.id}
            m={m}
            collapsed={collapsed}
            onHover={onHoverAgent}
            hl={highlightedAgent === m.id}
            active={activeAgent === m.id}
            onClick={onSelectAgent}
            {...rowProps(m)}
          />
        ))}
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 14px 4px', background: 'var(--cream-md)' }}>
          <div className="pc-kicker">
            ▸ AGENTS · {online}/{total}
          </div>
        </div>
      )}
      <div
        className="pc-scroll"
        style={{
          display: collapsed ? 'flex' : 'block',
          flexWrap: 'wrap',
          padding: collapsed ? 4 : 0,
          justifyContent: 'center',
          gap: collapsed ? 2 : 0,
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        {agents.length === 0 && !collapsed && (
          <div
            className="pc-mono"
            style={{ padding: 14, fontSize: 11, color: 'var(--muted)' }}
          >
            No agents registered yet. Run{' '}
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>krewcli daemon start</span> to
            bring agents online.
          </div>
        )}
        {sortedAgents.map((m) => (
          <PartyRow
            key={m.id}
            m={m}
            collapsed={collapsed}
            onHover={onHoverAgent}
            hl={highlightedAgent === m.id}
            active={activeAgent === m.id}
            onClick={onSelectAgent}
            {...rowProps(m)}
          />
        ))}
      </div>

      {/* Footer legend */}
      {!collapsed && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '2px solid var(--line)',
            background: 'var(--cream-md)',
          }}
        >
          <div className="pc-silk" style={{ fontSize: 8, color: 'var(--muted)', marginBottom: 4 }}>
            LEGEND
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              color: 'var(--muted)',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: 'var(--hp)',
                  border: '1px solid var(--line)',
                  marginRight: 6,
                }}
              />
              7D · LONG-WINDOW TOKENS
            </div>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: 'var(--mp)',
                  border: '1px solid var(--line)',
                  marginRight: 6,
                }}
              />
              5H · SHORT-WINDOW TOKENS
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
