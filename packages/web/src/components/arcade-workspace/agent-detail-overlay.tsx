/**
 * AgentDetailOverlay — pops up next to the sidebar when an agent is
 * clicked. Shows portrait, role, capabilities, token-usage bars, and
 * the agent's current quest if any.
 *
 * Humans get a slimmed-down version (no tools section) so the overlay
 * can be reused for both kinds of party members.
 */
'use client'

import { LED, PixelBtn, Sprite16, PORTRAITS } from './pixel-chrome'
import { TokBar } from './tok-bar'
import { crewColorFor } from './crew'
import type { PartyMember, Quest } from './mapping'

export function AgentDetailOverlay({
  member,
  currentQuest,
  onClose,
}: {
  member: PartyMember
  /** The quest this agent/human is currently driving, if any. */
  currentQuest: Quest | null
  onClose: () => void
}) {
  const portrait = PORTRAITS[member.sprite] ?? PORTRAITS.human
  const crew = crewColorFor(member.crew)
  const isAgent = member.kind === 'agent'

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        width: 360,
        zIndex: 24,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="pc-bevel"
        style={{ padding: 0, background: 'var(--cream-hi)' }}
      >
        {/* Header — portrait + name + role */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: 14,
            borderBottom: '2px solid var(--line)',
            background: crew?.color ?? 'var(--amber)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Sprite16 art={portrait} size={64} bg="#FFFEF5" />
            <div style={{ position: 'absolute', top: -3, right: -3 }}>
              <LED state={member.status} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pc-display" style={{ fontSize: 14, color: 'var(--ink)' }}>
              {member.name}
            </div>
            <div
              className="pc-silk"
              style={{ fontSize: 9, color: 'var(--ink-soft)', marginTop: 4 }}
            >
              {member.className}
            </div>
            <div
              className="pc-mono"
              style={{
                fontSize: 10,
                marginTop: 4,
                color: 'var(--ink-soft)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={member.role}
            >
              {member.role}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="close"
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1.5px solid var(--line)',
              padding: '2px 8px',
              fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
              fontSize: 10,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isAgent && (
            <>
              <TokBar
                window="7d"
                used={member.tok7d}
                max={member.tok7dMax}
                hot={
                  member.tok7d !== null &&
                  member.tok7dMax !== null &&
                  member.tok7dMax > 0
                    ? 1 - member.tok7d / member.tok7dMax <= 0.1
                    : false
                }
              />
              <TokBar
                window="5h"
                used={member.tok5h}
                max={member.tok5hMax}
                hot={
                  member.tok5h !== null &&
                  member.tok5hMax !== null &&
                  member.tok5hMax > 0
                    ? 1 - member.tok5h / member.tok5hMax <= 0.1
                    : false
                }
              />

              {member.tools.length > 0 && (
                <div style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 10 }}>
                  <div
                    className="pc-silk"
                    style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}
                  >
                    ▸ TOOLS EQUIPPED
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {member.tools.map((t) => (
                      <span key={t} className="pc-chip violet" style={{ fontSize: 9 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 10 }}>
            <div
              className="pc-silk"
              style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 4 }}
            >
              ▸ {isAgent ? 'CURRENT QUEST' : 'STATUS'}
            </div>
            {isAgent ? (
              currentQuest ? (
                <>
                  <div className="pc-mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                    #{currentQuest.no} · {currentQuest.title}
                  </div>
                  {currentQuest.status === 'working' && (
                    <div
                      style={{
                        width: '100%',
                        height: 4,
                        background: 'var(--cream-md)',
                        border: '1px solid var(--line)',
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${currentQuest.progressPct}%`,
                          background: 'var(--amber-deep)',
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="pc-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {member.detail}
                </div>
              )
            ) : (
              <div className="pc-mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                {member.detail}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <PixelBtn size="sm" variant="ghost">
              CLOSE
            </PixelBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
