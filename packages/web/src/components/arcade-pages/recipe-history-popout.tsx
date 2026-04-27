/**
 * RecipeHistoryPopout — git-like timeline of approved digests + facts ledger.
 *
 * Wired to getHistoryData(recipeId). Each HistoryRecord (digest + bundle)
 * renders as a commit node. Facts are aggregated from all digests and
 * shown in the right ledger.
 */
'use client'

import { useEffect, useState, useMemo } from 'react'
import type { FactRef, HistoryData } from '@cookrew/shared'
import { getHistoryData } from '@/lib/api'
import { PoModal } from './po-modal'

export function RecipeHistoryPopout({
  recipeId,
  onClose,
}: {
  recipeId: string
  onClose: () => void
}) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [factFilter, setFactFilter] = useState<
    'ALL' | 'PINNED' | 'LIVE' | 'EVENT'
  >('ALL')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const d = await getHistoryData(recipeId)
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
  }, [recipeId])

  const records = data?.records ?? []
  const recipe = data?.recipe ?? null
  const metrics = data?.metrics ?? null

  const facts: Array<FactRef & { t: string }> = useMemo(
    () =>
      records.flatMap((r) =>
        r.digest.facts.map((f) => ({
          ...f,
          t: relTime(r.digest.submitted_at),
        })),
      ),
    [records],
  )

  const filteredFacts = facts.filter((f) => {
    if (factFilter === 'ALL') return true
    if (factFilter === 'PINNED') return (f.confidence ?? 0) >= 0.9
    if (factFilter === 'LIVE') return (f.confidence ?? 0) >= 0.5
    return (f.confidence ?? 0) < 0.5
  })

  return (
    <PoModal
      width={1280}
      height={740}
      title={`RECIPE · ${(recipe?.name ?? 'LOADING').toUpperCase()}`}
      subtitle={`history · ${recipe?.default_branch ?? '—'}`}
      onClose={onClose}
      toolbar={
        <>
          <button type="button" className="ap-btn tiny" onClick={onClose}>
            ◀ BACK
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
          <button type="button" className="ap-btn tiny primary">
            HISTORY
          </button>
          <button type="button" className="ap-btn tiny">
            FACTS
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
          <div className="ap-silk" style={{ fontSize: 9, color: 'var(--muted)' }}>
            BRANCH:
          </div>
          <div
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 11,
              padding: '3px 8px',
              border: '1.5px solid var(--line)',
              background: 'var(--cream-hi)',
            }}
          >
            {recipe?.default_branch ?? 'main'} ▾
          </div>
          <div style={{ flex: 1 }} />
          <span className="ap-chip amber">⟳ {records.length} DIGESTS</span>
          <span className="ap-chip violet">≋ {facts.length} FACTS</span>
          {metrics?.median_review_minutes != null && (
            <span className="ap-chip slate">
              ~{metrics.median_review_minutes}m review
            </span>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Commit timeline */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            borderRight: '2px solid var(--line)',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '2px dashed var(--line-soft)',
              background: 'var(--cream-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ DIGEST TIMELINE · DESC
            </div>
            <div style={{ flex: 1 }} />
            <span className="ap-chip slate">APPROVED</span>
            <span className="ap-chip slate">REJECTED</span>
          </div>
          <div
            className="ap-scroll"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px 16px',
              background: 'var(--cream-hi)',
            }}
          >
            {error && (
              <div
                className="ap-card"
                style={{
                  padding: 12,
                  background: '#FEE2E2',
                  color: 'var(--rose)',
                  marginBottom: 14,
                }}
              >
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
                ▸ loading digests…
              </div>
            )}
            {data && records.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--muted)',
                }}
              >
                <div className="ap-silk" style={{ fontSize: 11, marginBottom: 6 }}>
                  ▸ NO DIGESTS YET
                </div>
                <div style={{ fontSize: 12 }}>
                  Approve a bundle review to anchor your first durable digest.
                </div>
              </div>
            )}
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {records.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--line)',
                  }}
                />
              )}
              {records.map((r, i) => {
                const d = r.digest
                const who = d.submitted_by.split('@')[0].toUpperCase()
                const agentKind = d.submitted_by.includes('@')
                const decisionOk = d.decision === 'approved'
                return (
                  <div
                    key={d.id}
                    style={{ position: 'relative', paddingBottom: 14 }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: -23,
                        top: 4,
                        width: 14,
                        height: 14,
                        background: i === 0 ? 'var(--amber)' : agentKind ? 'var(--cream-hi)' : 'var(--violet-soft)',
                        border: '2px solid var(--line)',
                        boxShadow: i === 0 ? '0 0 0 2px var(--amber-soft)' : 'none',
                      }}
                    />
                    <div
                      style={{
                        border: i === 0 ? '2px solid var(--amber-deep)' : '2px solid var(--line)',
                        background: i === 0 ? 'var(--amber-cream)' : 'var(--cream-hi)',
                        padding: '8px 12px',
                        boxShadow: '2px 2px 0 var(--line)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="ap-mono"
                          style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}
                        >
                          {d.id.slice(0, 10)}
                        </span>
                        <span
                          className={`ap-chip ${agentKind ? 'blue' : 'violet'}`}
                          style={{ fontSize: 8 }}
                        >
                          {who}
                        </span>
                        <span
                          className={`ap-chip ${decisionOk ? 'emerald' : 'rose'}`}
                          style={{ fontSize: 8 }}
                        >
                          {d.decision.toUpperCase()}
                        </span>
                        {r.bundle && (
                          <span className="ap-chip amber" style={{ fontSize: 8 }}>
                            ↑ {r.bundle.id.slice(0, 10)}
                          </span>
                        )}
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontFamily:
                              "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: 'var(--muted)',
                          }}
                        >
                          {relTime(d.submitted_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--ink)',
                          fontFamily:
                            "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                          lineHeight: 1.4,
                        }}
                      >
                        {d.summary || '(no summary)'}
                      </div>
                      {i === 0 && r.bundle && (
                        <div
                          style={{
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: '1px dashed var(--line-soft)',
                            display: 'flex',
                            gap: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            className="ap-btn tiny primary"
                            onClick={() => {
                              if (r.bundle)
                                location.href = `/recipes/${recipeId}?popout=review&bundle=${r.bundle.id}`
                            }}
                          >
                            ▸ REVIEW BUNDLE
                          </button>
                          {d.facts.length > 0 && (
                            <span className="ap-chip violet" style={{ fontSize: 8 }}>
                              ≋ {d.facts.length} FACT{d.facts.length > 1 ? 'S' : ''}
                            </span>
                          )}
                          {d.code_refs.length > 0 && (
                            <span className="ap-chip slate" style={{ fontSize: 8 }}>
                              ƒ {d.code_refs.length} CODE REF
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Facts ledger */}
        <aside
          style={{
            width: 380,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--cream-hi)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '2px dashed var(--line-soft)',
              background: 'var(--cream-md)',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ FACTS LEDGER
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}
            >
              Context appended to this recipe. Agents read on claim, write on digest.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 14px',
              gap: 4,
              background: 'var(--cream-md)',
              borderBottom: '1px dashed var(--line-soft)',
              flexWrap: 'wrap',
            }}
          >
            {(['ALL', 'PINNED', 'LIVE', 'EVENT'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`ap-btn tiny ${factFilter === f ? 'primary' : ''}`}
                onClick={() => setFactFilter(f)}
              >
                {f} ({f === 'ALL' ? facts.length : filteredFactsOf(facts, f).length})
              </button>
            ))}
          </div>
          <div
            className="ap-scroll"
            style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}
          >
            {filteredFacts.length === 0 && (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 12,
                }}
              >
                No facts in this ledger yet.
              </div>
            )}
            {filteredFacts.map((f, i) => {
              const kind =
                (f.confidence ?? 0) >= 0.9
                  ? 'pinned'
                  : (f.confidence ?? 0) >= 0.5
                    ? 'live'
                    : 'event'
              return (
                <div
                  key={`${f.id}-${i}`}
                  style={{
                    border: '1.5px solid var(--line)',
                    background: kind === 'pinned' ? 'var(--amber-cream)' : 'var(--cream-hi)',
                    padding: '8px 10px',
                    marginBottom: 8,
                    boxShadow: '2px 2px 0 var(--line)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className="ap-mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                      {f.claim.slice(0, 50)}
                      {f.claim.length > 50 ? '…' : ''}
                    </span>
                    {kind === 'pinned' && (
                      <span className="ap-chip amber" style={{ fontSize: 8 }}>
                        📌 PIN
                      </span>
                    )}
                    {kind === 'live' && (
                      <span className="ap-chip blue" style={{ fontSize: 8 }}>
                        ◉ LIVE
                      </span>
                    )}
                    {kind === 'event' && (
                      <span className="ap-chip rose" style={{ fontSize: 8 }}>
                        ⚡ EVENT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily:
                        "var(--font-silkscreen), 'Silkscreen', monospace",
                      fontSize: 9,
                      color: 'var(--muted)',
                    }}
                  >
                    <span>by {f.captured_by.split('@')[0]}</span>
                    <span>·</span>
                    <span>{f.t}</span>
                    {f.confidence != null && (
                      <span style={{ marginLeft: 'auto' }}>
                        c={f.confidence.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderTop: '2px solid var(--line)',
              background: 'var(--cream-md)',
            }}
          >
            <div
              className="ap-silk"
              style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}
            >
              ▸ DATA FLOW
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--ink-soft)',
                lineHeight: 1.55,
              }}
            >
              sandbox
              <span style={{ color: 'var(--muted)' }}> ─▶ </span>recipe
              <span style={{ color: 'var(--muted)' }}> ─▶ </span>cookbook
              <br />
              <span style={{ color: 'var(--muted)' }}>claim</span>{' '}
              <span style={{ color: 'var(--muted)' }}>cook</span>{' '}
              <span style={{ color: 'var(--muted)' }}>digest ✓</span>
            </div>
          </div>
        </aside>
      </div>
    </PoModal>
  )
}

// ── helpers ─────────────────────────────────────────────

function relTime(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}d ago`
    return iso.slice(0, 10)
  } catch {
    return iso.slice(0, 10)
  }
}

function filteredFactsOf<T extends { confidence: number | null }>(
  facts: readonly T[],
  kind: 'PINNED' | 'LIVE' | 'EVENT',
): T[] {
  return facts.filter((f) => {
    if (kind === 'PINNED') return (f.confidence ?? 0) >= 0.9
    if (kind === 'LIVE') return (f.confidence ?? 0) >= 0.5 && (f.confidence ?? 0) < 0.9
    return (f.confidence ?? 0) < 0.5
  })
}
