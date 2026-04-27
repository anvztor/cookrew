/**
 * BundleReviewPopout — human-in-the-loop approval card.
 *
 * Fetches getDigestReviewData(recipeId, bundleId). Renders the task
 * checklist, aggregated code refs, fact refs, approver roster, and
 * an APPROVE & MERGE / REJECT action pair. Blocked when any task is
 * in blocked / cancelled state.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CodeRef,
  DigestReviewData,
  FactRef,
  Task,
} from '@cookrew/shared'
import { decideDigest, getDigestReviewData } from '@/lib/api'
import { PoModal } from './po-modal'

export function BundleReviewPopout({
  recipeId,
  bundleId,
  onClose,
}: {
  recipeId: string
  bundleId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [data, setData] = useState<DigestReviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(
    null,
  )

  const load = useCallback(async () => {
    setError(null)
    try {
      const d = await getDigestReviewData(recipeId, bundleId)
      setData(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    }
  }, [recipeId, bundleId])

  useEffect(() => {
    void load()
  }, [load])

  const selectedBundle = data?.selected_bundle ?? null
  const bundle = selectedBundle?.bundle ?? null
  const tasks = selectedBundle?.tasks ?? []
  const digest = selectedBundle?.digest ?? null

  const blocked = tasks.some(
    (t) => t.status === 'blocked' || t.status === 'cancelled',
  )
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'done')
  const ready = !blocked && allDone
  const blockedReasons = tasks
    .filter((t) => t.status === 'blocked' || t.status === 'cancelled')
    .map((t) => t.blocked_reason || `Task #${t.id.slice(-4)} failed`)

  const allCodeRefs: CodeRef[] =
    digest?.code_refs?.slice() ??
    aggregateCodeRefs(selectedBundle?.events ?? [])
  const fileCount = allCodeRefs.reduce((n, r) => n + r.paths.length, 0)

  const factRefs: FactRef[] =
    digest?.facts?.slice() ?? aggregateFacts(selectedBundle?.events ?? [])

  const decide = useCallback(
    async (decision: 'approved' | 'rejected') => {
      if (submitting) return
      setSubmitting(decision === 'approved' ? 'approve' : 'reject')
      try {
        const actor = digest?.submitted_by ?? 'human'
        const res = await decideDigest(recipeId, bundleId, {
          decision,
          decided_by: actor,
        })
        if (res.redirect_to) {
          router.push(res.redirect_to)
        } else {
          onClose()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Decision failed')
      } finally {
        setSubmitting(null)
      }
    },
    [submitting, digest, recipeId, bundleId, router, onClose],
  )

  return (
    <PoModal
      width={1340}
      height={780}
      title="BUNDLE REVIEW"
      subtitle={`${bundleId.slice(0, 12)} · ${blocked ? 'BLOCKED' : ready ? 'READY TO MERGE' : 'IN PROGRESS'}`}
      onClose={onClose}
      toolbar={
        <>
          <button type="button" className="ap-btn tiny" onClick={onClose}>
            ◀ BACK TO BOARD
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
          <span className="ap-chip slate">{fileCount} FILES</span>
          <span className="ap-chip violet">{tasks.length} TASKS</span>
          <span className={`ap-chip ${blocked ? 'rose' : ready ? 'emerald' : 'amber'}`}>
            {blocked ? '⚠ BLOCKED' : ready ? '✓ READY' : '◌ WORKING'}
          </span>
          {digest && (
            <span className={`ap-chip ${digest.decision === 'approved' ? 'emerald' : digest.decision === 'rejected' ? 'rose' : 'slate'}`}>
              DIGEST · {digest.decision.toUpperCase()}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="ap-btn tiny"
            onClick={() => void load()}
          >
            ◎ RECHECK
          </button>
          <button
            type="button"
            className="ap-btn tiny danger"
            onClick={() => void decide('rejected')}
            disabled={!digest || digest.decision !== 'pending' || submitting !== null}
          >
            {submitting === 'reject' ? '…' : '✗ REJECT'}
          </button>
          <button
            type="button"
            className={`ap-btn tiny ${blocked ? '' : 'primary'}`}
            onClick={() => void decide('approved')}
            disabled={
              blocked ||
              !digest ||
              digest.decision !== 'pending' ||
              submitting !== null
            }
          >
            {submitting === 'approve' ? '…' : '✓ APPROVE & MERGE'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: task checklist */}
        <div
          style={{
            width: 360,
            borderRight: '2px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--cream-hi)',
            flexShrink: 0,
          }}
        >
          {/* Hero summary */}
          <div
            style={{
              padding: '14px 16px',
              background: blocked
                ? 'linear-gradient(180deg, #FEE2E2 0%, #FCD5D5 100%)'
                : ready
                  ? 'linear-gradient(180deg, #D8F3E6 0%, #BFE8D2 100%)'
                  : 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)',
              borderBottom: '2px solid var(--line)',
              flexShrink: 0,
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
              ▸ HUMAN-IN-THE-LOOP · FINAL STAGE
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-press-start-2p), 'Press Start 2P', monospace",
                fontSize: 13,
                marginTop: 6,
                color: 'var(--ink)',
                lineHeight: 1.35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
              title={bundle?.prompt ?? ''}
            >
              &ldquo;{bundle?.prompt?.toUpperCase() ?? 'LOADING…'}&rdquo;
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}
            >
              {blocked ? (
                <>
                  <span className="ap-led red" />
                  <span
                    className="ap-mono"
                    style={{ fontSize: 11, color: 'var(--rose)', fontWeight: 600 }}
                  >
                    BLOCKED · {blockedReasons.length} check{blockedReasons.length > 1 ? 's' : ''} failed
                  </span>
                </>
              ) : ready ? (
                <>
                  <span className="ap-led on" />
                  <span
                    className="ap-mono"
                    style={{ fontSize: 11, color: '#0B4F2E', fontWeight: 600 }}
                  >
                    READY · all tasks done
                  </span>
                </>
              ) : (
                <>
                  <span className="ap-led busy" />
                  <span
                    className="ap-mono"
                    style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}
                  >
                    WORKING · {tasks.filter((t) => t.status === 'done').length}/
                    {tasks.length} done
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Task list */}
          <div
            className="ap-scroll"
            style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}
          >
            <div
              className="ap-silk"
              style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}
            >
              ▸ TASKS · {tasks.length}
            </div>
            {error && (
              <div
                className="ap-card"
                style={{
                  padding: 12,
                  background: '#FEE2E2',
                  color: 'var(--rose)',
                  marginBottom: 10,
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
                ▸ loading bundle…
              </div>
            )}
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>

          {/* Bottom merge plan */}
          {blocked ? (
            <div
              style={{
                padding: '12px 14px',
                borderTop: '2px solid var(--line)',
                background: '#FEE2E2',
                flexShrink: 0,
              }}
            >
              <div
                className="ap-silk"
                style={{ fontSize: 10, color: 'var(--rose)', marginBottom: 6 }}
              >
                ▸ BLOCKED · REQUIRES HUMAN
              </div>
              {blockedReasons.slice(0, 3).map((r, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: 'var(--ink)',
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {r}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <button type="button" className="ap-btn tiny" onClick={onClose}>
                  ⇅ REOPEN BOARD
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderTop: '2px solid var(--line)',
                background: 'var(--amber-cream)',
                flexShrink: 0,
              }}
            >
              <div
                className="ap-silk"
                style={{ fontSize: 10, color: 'var(--ink-soft)', marginBottom: 6 }}
              >
                ▸ MERGE PLAN
              </div>
              <div
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--ink)',
                  lineHeight: 1.6,
                }}
              >
                squash <b>{tasks.length}</b> task{tasks.length > 1 ? 's' : ''} ─▶ <b>main</b>
                <br />
                digest: <b>{bundleId.slice(0, 12)}</b>
                <br />
                <span style={{ color: 'var(--muted)' }}>
                  # facts persist, events expire 7d
                </span>
              </div>
              <button
                type="button"
                className="ap-btn sm primary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => void decide('approved')}
                disabled={
                  !digest ||
                  digest.decision !== 'pending' ||
                  !ready ||
                  submitting !== null
                }
              >
                {submitting === 'approve' ? '…' : '✓ APPROVE & MERGE'}
              </button>
            </div>
          )}
        </div>

        {/* Center: code refs */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            background: 'var(--cream-hi)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '2px dashed var(--line-soft)',
              background: 'var(--cream-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ CODE REFS
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--ink)',
              }}
            >
              {fileCount} file{fileCount === 1 ? '' : 's'} ·{' '}
              {allCodeRefs.length} commit{allCodeRefs.length === 1 ? '' : 's'}
            </div>
          </div>
          <div
            className="ap-scroll"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '14px',
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            {allCodeRefs.length === 0 && (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                }}
              >
                No code refs pushed by agents yet.
              </div>
            )}
            {allCodeRefs.map((r, i) => (
              <div
                key={`${r.commit_sha}-${i}`}
                style={{
                  border: '1.5px solid var(--line)',
                  background: 'var(--cream)',
                  padding: '8px 10px',
                  marginBottom: 10,
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
                    style={{
                      fontWeight: 600,
                      color: 'var(--ink)',
                      fontSize: 11,
                    }}
                  >
                    {r.commit_sha.slice(0, 8)}
                  </span>
                  <span className="ap-chip slate" style={{ fontSize: 8 }}>
                    {r.branch || 'main'}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--muted)',
                      fontSize: 10,
                    }}
                  >
                    {shortRepoUrl(r.repo_url)}
                  </span>
                </div>
                {r.paths.map((p) => (
                  <div
                    key={p}
                    style={{
                      fontSize: 11,
                      color: 'var(--ink)',
                      padding: '2px 0',
                      borderTop: '1px dashed var(--line-soft)',
                      marginTop: 3,
                      paddingTop: 4,
                    }}
                  >
                    <span style={{ color: 'var(--emerald-dim)' }}>+</span> {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: facts + approvers */}
        <aside
          style={{
            width: 300,
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
              background: 'var(--cream-md)',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ FACT REFS · {factRefs.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
              Context this bundle wrote.
            </div>
          </div>
          <div
            className="ap-scroll"
            style={{ overflow: 'auto', padding: '10px 14px', maxHeight: 280 }}
          >
            {factRefs.length === 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  padding: 8,
                }}
              >
                No facts recorded.
              </div>
            )}
            {factRefs.map((f, i) => (
              <div
                key={`${f.id}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom:
                    i < factRefs.length - 1 ? '1px dashed var(--line-soft)' : 'none',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: '1.5px solid var(--line)',
                    background: '#A9E4C2',
                    fontFamily:
                      "var(--font-press-start-2p), 'Press Start 2P', monospace",
                    fontSize: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  +
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="ap-mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                    title={f.claim}
                  >
                    {f.claim}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "var(--font-silkscreen), 'Silkscreen', monospace",
                      fontSize: 9,
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}
                  >
                    {f.captured_by.split('@')[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderTop: '2px solid var(--line)',
              borderBottom: '2px dashed var(--line-soft)',
              background: 'var(--cream-md)',
            }}
          >
            <div className="ap-silk" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ▸ APPROVERS
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {digest ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    background:
                      digest.decision === 'approved'
                        ? '#6BBE58'
                        : digest.decision === 'rejected'
                          ? '#DC2626'
                          : '#FFD600',
                    border: '1.5px solid var(--line)',
                    fontFamily:
                      "var(--font-press-start-2p), 'Press Start 2P', monospace",
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: digest.decision === 'approved' ? '#fff' : '#2D2A20',
                  }}
                >
                  {(digest.decided_by ?? digest.submitted_by).slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ap-silk" style={{ fontSize: 10 }}>
                    {(digest.decided_by ?? 'awaiting').toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "var(--font-silkscreen), 'Silkscreen', monospace",
                      fontSize: 9,
                      color: 'var(--muted)',
                    }}
                  >
                    submitted by {digest.submitted_by.split('@')[0]}
                  </div>
                </div>
                <span
                  className={`ap-chip ${digest.decision === 'approved' ? 'emerald' : digest.decision === 'rejected' ? 'rose' : 'slate'}`}
                  style={{ fontSize: 8 }}
                >
                  {digest.decision === 'approved'
                    ? '✓ OK'
                    : digest.decision === 'rejected'
                      ? '✗ NO'
                      : '⏳ WAIT'}
                </span>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  padding: 8,
                }}
              >
                Digest not yet submitted. Bundle must be cooked first.
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              marginTop: 'auto',
              borderTop: '2px solid var(--line)',
              background: 'var(--cream-md)',
            }}
          >
            <div
              className="ap-silk"
              style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}
            >
              ▸ POST-MERGE PREVIEW
            </div>
            <div
              className="ap-phos"
              style={{ padding: '8px 10px', fontSize: 12, minHeight: 96 }}
            >
              <div>&gt; squash {tasks.length} ─▶ main</div>
              <div>
                &gt; digest <span className="hi">{bundleId.slice(0, 10)}</span>{' '}
                {ready ? '✓' : '…'}
              </div>
              <div className="dim">
                &gt; {allCodeRefs.length} commits · {fileCount} files
              </div>
              <div>
                &gt; facts: +{factRefs.length}
              </div>
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

// ── Task checklist row ──────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const ok = task.status === 'done'
  const err = task.status === 'blocked' || task.status === 'cancelled'
  const statusColor = ok ? '#6BBE58' : err ? '#DC2626' : '#D97706'
  return (
    <div
      style={{
        border: '1.5px solid var(--line)',
        background: err ? '#FEE2E2' : 'var(--cream-hi)',
        padding: '8px 10px',
        marginBottom: 6,
        boxShadow: '2px 2px 0 var(--line)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid var(--line)',
            background: statusColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 8,
            flexShrink: 0,
          }}
        >
          {ok ? '✓' : err ? '!' : '◌'}
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 12,
            color: 'var(--ink)',
            fontWeight: 500,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
          title={task.title}
        >
          {task.title}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 5,
          paddingLeft: 24,
          fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
          fontSize: 9,
          color: 'var(--muted)',
        }}
      >
        <span>{task.claimed_by_agent_id?.split('@')[0].toUpperCase() ?? '—'}</span>
        <span>·</span>
        <span>{task.status.toUpperCase()}</span>
      </div>
      {err && task.blocked_reason && (
        <div
          style={{
            marginTop: 6,
            padding: '6px 8px',
            background: '#FFFEF5',
            border: '1.5px dashed var(--rose)',
            fontFamily:
              "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--rose)',
          }}
        >
          {task.blocked_reason}
        </div>
      )}
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────

function aggregateCodeRefs(
  events: readonly { code_refs: readonly CodeRef[] }[],
): CodeRef[] {
  const seen = new Set<string>()
  const out: CodeRef[] = []
  for (const e of events) {
    for (const r of e.code_refs) {
      const key = `${r.commit_sha}:${r.paths.join(',')}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(r)
    }
  }
  return out
}

function aggregateFacts(
  events: readonly { facts: readonly FactRef[] }[],
): FactRef[] {
  const seen = new Set<string>()
  const out: FactRef[] = []
  for (const e of events) {
    for (const f of e.facts) {
      if (seen.has(f.id)) continue
      seen.add(f.id)
      out.push(f)
    }
  }
  return out
}

function shortRepoUrl(url: string): string {
  if (!url) return ''
  const m = url.match(/([^/:]+\/[^/]+?)(?:\.git)?$/)
  return m ? m[1] : url
}
