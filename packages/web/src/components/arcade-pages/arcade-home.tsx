/**
 * ArcadeHome — lobby for discovering projects and reporting-in.
 *
 * Lists all cookbooks (projects) the user has access to, their
 * recipes, online agents, and recent digests. Picking a project
 * navigates to its first recipe's workspace via ?popout=cookbook.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { CookbookData } from '@cookrew/shared'
import { getCookbookData } from '@/lib/api'
import { useAuthContext } from '@/components/auth-provider'
import { ApCartridge, ApPlayerPill, ApTopBar, iconFor, swatchFor } from './ap-chrome'

export function ArcadeHome() {
  const { authenticated, username, walletAddress, login, logout, loading } =
    useAuthContext()
  const router = useRouter()
  const [data, setData] = useState<CookbookData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const d = await getCookbookData()
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load lobby.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = data?.cookbooks ?? []

  const totalRecipes = groups.reduce((n, g) => n + g.recipes.length, 0)
  const totalAgents = groups.reduce((n, g) => n + g.agents.length, 0)
  const onlineAgents = groups.reduce(
    (n, g) => n + g.agents.filter((a) => a.status !== 'offline').length,
    0,
  )
  const openBundles = groups.reduce(
    (n, g) =>
      n +
      g.recipes.reduce(
        (m, r) => m + (r.active_bundle_count || 0),
        0,
      ),
    0,
  )
  const approvedDigests = groups.reduce(
    (n, g) => n + g.recipes.filter((r) => r.latest_digest).length,
    0,
  )
  const totalMembers = groups.reduce(
    (n, g) => n + g.recipes.reduce((m, r) => m + r.member_count, 0),
    0,
  )

  const q = search.trim().toLowerCase()
  const filteredGroups = q
    ? groups
        .map((g) => ({
          ...g,
          recipes: g.recipes.filter(
            (r) =>
              g.cookbook.name.toLowerCase().includes(q) ||
              r.recipe.name.toLowerCase().includes(q) ||
              r.recipe.repo_url.toLowerCase().includes(q),
          ),
        }))
        .filter(
          (g) =>
            g.cookbook.name.toLowerCase().includes(q) ||
            g.recipes.length > 0,
        )
    : groups

  return (
    <div
      className="ap-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <ApTopBar
        crumbs={['ARCADE', 'LOBBY']}
        right={
          <ApPlayerPill
            name={username ?? null}
            loggedIn={Boolean(authenticated)}
            walletAddress={walletAddress}
            digestCount={approvedDigests}
            onLogin={() => void login()}
            onLogout={() => void logout()}
          />
        }
      />

      {/* Hero */}
      <div
        style={{
          borderBottom: '2px solid var(--line)',
          background: 'var(--cream-hi)',
          padding: '22px 36px 20px',
          display: 'flex',
          gap: 28,
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <div
            className="ap-silk"
            style={{ fontSize: 11, color: 'var(--amber-deep)', marginBottom: 10 }}
          >
            ▸ PLAYER {authenticated ? '1 · READY' : '?? · INSERT COIN'}
          </div>
          <div
            className="ap-press"
            style={{
              fontSize: 24,
              color: 'var(--ink)',
              marginBottom: 14,
              lineHeight: 1.3,
            }}
          >
            WELCOME TO <span style={{ color: 'var(--amber-deep)' }}>COOKREW</span>
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              maxWidth: 520,
              lineHeight: 1.5,
            }}
          >
            Pick a project to <b style={{ color: 'var(--ink)' }}>report-in</b> —
            load its recipe cartridge, scout its bundles, bring your agent
            online. All task activity happens inside a recipe&apos;s{' '}
            <b>workspace</b>.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              className="ap-btn primary"
              type="button"
              onClick={() => {
                const firstGroup = groups[0]
                const firstRecipe = firstGroup?.recipes[0]?.recipe
                if (firstRecipe) router.push(`/recipes/${firstRecipe.id}`)
              }}
              disabled={groups.length === 0}
            >
              ▶ START GAME · JOIN A PROJECT
            </button>
            {!authenticated && (
              <button
                className="ap-btn"
                type="button"
                onClick={() => void login()}
              >
                ⎇ CONNECT WALLET
              </button>
            )}
          </div>
        </div>
        {/* Phosphor "how it works" readout */}
        <div
          className="ap-phos"
          style={{ width: 360, padding: '14px 16px', fontSize: 14, minHeight: 170 }}
        >
          <div className="hi" style={{ marginBottom: 6 }}>&gt; cookrew --lobby</div>
          <div className="dim">&gt; loading arcade cabinet...</div>
          <div>&gt; [1] <span className="hi">sandbox</span> · agent scratch</div>
          <div>&gt; [2] <span className="hi">recipe</span> · git repo + facts</div>
          <div>&gt; [3] <span className="hi">cookbook</span> · shelf of recipes</div>
          <div className="dim">&gt; artifacts run inside workspace</div>
          <div className="dim">&gt; digests persist · events expire 7d</div>
          <div style={{ marginTop: 6 }}>
            &gt; ready player_
            <span style={{ animation: 'ap-blink .7s step-end infinite' }}>▮</span>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--line)',
          background: 'var(--cream-md)',
          flexWrap: 'wrap',
        }}
      >
        {[
          ['▸ PROJECTS', String(groups.length), 'cookbooks'],
          ['▸ RECIPES', String(totalRecipes), 'across all projects'],
          ['▸ AGENTS', String(totalAgents), `${onlineAgents} online now`],
          ['▸ BUNDLES', String(openBundles), 'open · awaiting claim'],
          ['▸ DIGESTS', String(approvedDigests), 'approved · durable'],
          ['▸ MEMBERS', String(totalMembers), 'humans + agents'],
        ].map(([k, v, sub], i) => (
          <div
            key={k}
            style={{
              flex: '1 1 140px',
              padding: '12px 16px',
              borderRight: i < 5 ? '1px dashed var(--line-soft)' : 'none',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 9, color: 'var(--muted)' }}>
              {k}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div className="ap-press" style={{ fontSize: 16, color: 'var(--ink)' }}>
                {v}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Body: catalog + side */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          className="ap-scroll"
          style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--cream)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
                ▸ CABINET · SELECT CARTRIDGE
              </div>
              <div className="ap-press" style={{ fontSize: 15, marginTop: 6 }}>
                EXPLORE PROJECTS
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                border: '2px solid var(--line)',
                background: 'var(--cream-hi)',
                padding: '4px 10px',
                boxShadow: '2px 2px 0 var(--line)',
              }}
            >
              <span className="ap-silk" style={{ fontSize: 9, color: 'var(--muted)' }}>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search project or recipe…"
                style={{
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontFamily:
                    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--ink)',
                  minWidth: 200,
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily:
                      "var(--font-silkscreen), 'Silkscreen', monospace",
                    fontSize: 10,
                    color: 'var(--muted)',
                  }}
                  title="clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {error && (
            <div
              className="ap-card"
              style={{ padding: 16, background: '#FEE2E2', color: 'var(--rose)', marginBottom: 16 }}
            >
              <div className="ap-silk" style={{ fontSize: 10, marginBottom: 4 }}>
                ▸ LOAD ERROR
              </div>
              <div style={{ fontSize: 13 }}>{error}</div>
            </div>
          )}

          {!loading && filteredGroups.length === 0 && !error && (
            <div
              className="ap-card"
              style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}
            >
              <div className="ap-silk" style={{ fontSize: 11, marginBottom: 6 }}>
                ▸ NO PROJECTS YET
              </div>
              <div style={{ fontSize: 13 }}>
                {q
                  ? `Nothing matches "${q}". Clear the search to see all projects.`
                  : 'Create a cookbook via the krewhub API to get started.'}
              </div>
            </div>
          )}

          {/* Shelves — one per cookbook */}
          {filteredGroups.map((group) => (
            <div key={group.cookbook.id} style={{ marginBottom: 26 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div className="ap-silk" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                  ▸ {group.cookbook.name.toUpperCase()}
                </div>
                <div className="ap-chip slate" style={{ fontSize: 8 }}>
                  {group.recipes.length} recipes
                </div>
                <div className="ap-chip slate" style={{ fontSize: 8 }}>
                  {group.agents.length} agents
                </div>
              </div>
              <div
                className="ap-shelf"
                style={{
                  padding: '28px 20px 22px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 18,
                }}
              >
                {group.recipes.length === 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    Empty shelf — add a recipe to this cookbook.
                  </div>
                )}
                {group.recipes.map((rs) => {
                  const r = rs.recipe
                  return (
                    <Link
                      key={r.id}
                      href={`/recipes/${r.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <ApCartridge
                          title={r.name}
                          subtitle={r.default_branch}
                          swatch={swatchFor(r.id)}
                          icon={iconFor(r.name)}
                          w="100%"
                          h={180}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          <span
                            className={`ap-led ${rs.online_agent_count > 0 ? 'on' : 'off'}`}
                          />
                          <span
                            className="ap-mono"
                            style={{ fontSize: 11, color: 'var(--ink)' }}
                          >
                            {rs.online_agent_count}/{rs.agent_count} online
                          </span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontFamily:
                                "var(--font-silkscreen), 'Silkscreen', monospace",
                              fontSize: 9,
                              color: 'var(--muted)',
                            }}
                            title={rs.latest_digest ? 'Has approved digest' : 'No digests yet'}
                          >
                            {rs.latest_digest ? '✓ DIGESTED' : '—'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {rs.active_bundle_count > 0
                            ? `${rs.active_bundle_count} active bundle${rs.active_bundle_count > 1 ? 's' : ''} · ${rs.member_count} member${rs.member_count > 1 ? 's' : ''}`
                            : 'Idle — ready to cook'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <button
                            type="button"
                            className="ap-btn tiny primary"
                            style={{ flex: 1 }}
                          >
                            ▶ REPORT-IN
                          </button>
                          <button type="button" className="ap-btn tiny" title="info">
                            i
                          </button>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right rail — watchtower + leaderboard placeholder */}
        <aside
          style={{
            width: 320,
            borderLeft: '2px solid var(--line)',
            background: 'var(--cream-hi)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '2px solid var(--line)',
              background: 'var(--amber)',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
              ▸ STATUS · THIS MOMENT
            </div>
            <div className="ap-press" style={{ fontSize: 12, marginTop: 5 }}>
              LIVE ROSTER
            </div>
          </div>
          <div
            className="ap-scroll"
            style={{ padding: '10px 14px', flex: 1, overflow: 'auto' }}
          >
            {groups.flatMap((g) =>
              g.agents.slice(0, 2).map((a, idx) => (
                <div
                  key={`${g.cookbook.id}-${a.agent_id}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px dashed var(--line-soft)',
                  }}
                >
                  <span
                    className={`ap-led ${a.status === 'online' ? 'on' : a.status === 'busy' ? 'busy' : 'off'}`}
                  />
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: swatchColorFor(a.agent_id),
                      border: '1.5px solid var(--line)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="ap-silk"
                      style={{
                        fontSize: 10,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.agent_id.split('@')[0].toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--muted)',
                        fontFamily:
                          "var(--font-silkscreen), 'Silkscreen', monospace",
                      }}
                    >
                      {g.cookbook.name} · {a.status}
                    </div>
                  </div>
                </div>
              )),
            )}
            {groups.every((g) => g.agents.length === 0) && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  padding: 12,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                No agents online — start{' '}
                <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                  krewcli daemon
                </span>{' '}
                to bring one up.
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: '2px solid var(--line)',
              padding: '12px 14px',
              background: 'var(--cream-md)',
            }}
          >
            <div
              className="ap-silk"
              style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 8 }}
            >
              ▸ LIVE BROADCAST · WATCHTOWER
            </div>
            <div className="ap-phos" style={{ padding: '8px 10px', fontSize: 12, lineHeight: 1.4, minHeight: 80 }}>
              <div>
                &gt; <span className="hi">krewhub</span>: {openBundles} open
              </div>
              <div>
                &gt; <span className="hi">agents</span>: {onlineAgents} online
              </div>
              <div>
                &gt; <span className="hi">digests</span>: {approvedDigests}{' '}
                approved
              </div>
              <div className="dim">&gt; events expire after 7d</div>
              <div>
                &gt; _<span style={{ animation: 'ap-blink .7s step-end infinite' }}>▮</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Global scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 3px, rgba(0,0,0,.03) 3px 4px)',
        }}
      />
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────

function swatchColorFor(id: string): string {
  const colors = ['#FFD600', '#9B8ACB', '#6BBE58', '#4AA3E6', '#DC2626', '#2D2A20']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return colors[Math.abs(h) % colors.length]
}
