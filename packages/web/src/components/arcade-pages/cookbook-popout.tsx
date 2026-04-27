/**
 * CookbookPopout — project's recipe shelf, opens over the workspace.
 *
 * Fetches the cookbook detail for the current recipe and renders a
 * grid of recipe cartridges. Clicking a cartridge navigates to that
 * recipe's workspace.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CookbookDetailData } from '@cookrew/shared'
import { getCookbookDetailData } from '@/lib/api'
import { ApCartridge, iconFor, swatchFor } from './ap-chrome'
import { PoModal } from './po-modal'

export function CookbookPopout({
  cookbookId,
  onClose,
}: {
  cookbookId: string
  onClose: () => void
}) {
  const [data, setData] = useState<CookbookDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cookbookId) return
    let cancelled = false
    void (async () => {
      try {
        const d = await getCookbookDetailData(cookbookId)
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cookbookId])

  const recipes = data?.recipes ?? []
  const agents = data?.agents ?? []
  const onlineAgents = agents.filter((a) => a.status !== 'offline').length
  const cooking = recipes.reduce((n, r) => n + r.active_bundle_count, 0)

  return (
    <PoModal
      width={1200}
      height={720}
      title={`COOKBOOK · ${(data?.cookbook.name ?? 'LOADING').toUpperCase()}`}
      subtitle="recipes · artifacts · git"
      onClose={onClose}
      toolbar={
        <>
          <button type="button" className="ap-btn tiny">
            ＋ NEW RECIPE
          </button>
          <button type="button" className="ap-btn tiny">
            ⎘ IMPORT REPO
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
          <div className="ap-silk" style={{ fontSize: 9, color: 'var(--muted)' }}>
            SORT:
          </div>
          <button type="button" className="ap-btn tiny primary">
            RECENT
          </button>
          <button type="button" className="ap-btn tiny">
            NAME
          </button>
          <div style={{ flex: 1 }} />
          <div className="ap-chip slate">{recipes.length} recipes</div>
          <div className="ap-chip slate">
            {onlineAgents}/{agents.length} agents
          </div>
          <div className="ap-chip amber">{cooking} cooking</div>
        </>
      }
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Main shelf */}
        <div
          className="ap-scroll"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            background: 'var(--cream)',
          }}
        >
          {/* Intro strip */}
          <div
            style={{
              border: '2px solid var(--line)',
              background: 'var(--amber-cream)',
              padding: '10px 14px',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 22 }}>📖</div>
            <div style={{ flex: 1 }}>
              <div className="ap-silk" style={{ fontSize: 10, color: 'var(--ink)' }}>
                ▸ THIS IS YOUR COOKBOOK
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Each <b style={{ color: 'var(--ink)' }}>recipe</b> is a git repo
                with facts attached. Agents cook in sandboxes, then submit
                digests to land on a recipe&apos;s main.
              </div>
            </div>
          </div>

          {error && (
            <div
              className="ap-card"
              style={{
                padding: 14,
                background: '#FEE2E2',
                color: 'var(--rose)',
                marginBottom: 16,
              }}
            >
              <div className="ap-silk" style={{ fontSize: 10, marginBottom: 4 }}>
                ▸ LOAD ERROR
              </div>
              {error}
            </div>
          )}

          {!data && !error && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--muted)',
                fontFamily:
                  "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 12,
              }}
            >
              ▸ loading cookbook…
            </div>
          )}

          {recipes.length > 0 && (
            <>
              <div
                className="ap-silk"
                style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}
              >
                ▸ SHELF · {recipes.length} RECIPE{recipes.length > 1 ? 'S' : ''}
              </div>
              <div
                className="ap-shelf"
                style={{
                  padding: '28px 18px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: 18,
                }}
              >
                {recipes.map((rs) => {
                  const r = rs.recipe
                  return (
                    <Link
                      key={r.id}
                      href={`/recipes/${r.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      onClick={onClose}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <ApCartridge
                          title={r.name}
                          subtitle={r.default_branch}
                          swatch={swatchFor(r.id)}
                          icon={iconFor(r.name)}
                          w="100%"
                          h={164}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <span
                            className={`ap-led ${rs.active_bundle_count > 0 ? 'busy' : rs.online_agent_count > 0 ? 'on' : 'off'}`}
                          />
                          <span
                            className="ap-mono"
                            style={{ fontSize: 10, color: 'var(--ink)' }}
                          >
                            {rs.active_bundle_count > 0
                              ? `${rs.active_bundle_count} cooking`
                              : rs.online_agent_count > 0
                                ? 'idle'
                                : 'stale'}
                          </span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontFamily:
                                "var(--font-silkscreen), 'Silkscreen', monospace",
                              fontSize: 9,
                              color: 'var(--muted)',
                            }}
                          >
                            {rs.latest_digest ? '✓' : '—'} · {rs.member_count}{' '}
                            mem
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            minHeight: 28,
                          }}
                        >
                          {r.repo_url || 'Local recipe'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <button
                            type="button"
                            className="ap-btn tiny primary"
                            style={{ flex: 1 }}
                          >
                            ▶ OPEN
                          </button>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Side panel — artifact anatomy */}
        <aside
          style={{
            width: 280,
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
              padding: '10px 14px',
              borderBottom: '2px dashed var(--line-soft)',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ ARTIFACT ANATOMY
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-soft)',
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              Three shapes agents can modify at runtime.
            </div>
          </div>

          {[
            {
              k: 'SANDBOX',
              c: 'violet',
              d: 'Agent scratch. One per claimed task. Ephemeral branch.',
              stat: `${cooking} live`,
            },
            {
              k: 'RECIPE',
              c: 'amber',
              d: 'Git repo + facts ledger. The thing agents cook on.',
              stat: `${recipes.length} in book`,
            },
            {
              k: 'COOKBOOK',
              c: 'emerald',
              d: 'Shelf of recipes for this project. One per cookbook.',
              stat: 'this view',
            },
          ].map((x) => (
            <div
              key={x.k}
              style={{
                padding: '12px 14px',
                borderBottom: '1px dashed var(--line-soft)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span className={`ap-chip ${x.c}`}>{x.k}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily:
                      "var(--font-silkscreen), 'Silkscreen', monospace",
                    fontSize: 9,
                    color: 'var(--muted)',
                  }}
                >
                  {x.stat}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  lineHeight: 1.4,
                }}
              >
                {x.d}
              </div>
            </div>
          ))}

          <div
            style={{
              padding: '12px 14px',
              background: 'var(--cream-md)',
              borderTop: '2px solid var(--line)',
              marginTop: 'auto',
            }}
          >
            <div
              className="ap-silk"
              style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}
            >
              ▸ COOKBOOK LIVE
            </div>
            <div
              className="ap-phos"
              style={{ padding: '8px 10px', fontSize: 12, minHeight: 68 }}
            >
              <div>&gt; <span className="hi">{data?.cookbook.name ?? '...'}</span></div>
              <div>&gt; {recipes.length} recipes · {agents.length} agents</div>
              <div className="dim">&gt; {onlineAgents} online · {cooking} cooking</div>
              <div>
                &gt; _
                <span style={{ animation: 'ap-blink .7s step-end infinite' }}>▮</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PoModal>
  )
}
