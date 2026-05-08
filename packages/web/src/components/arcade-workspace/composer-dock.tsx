/**
 * ComposerDock — always-on bottom arcade cabinet input.
 *
 * Slash commands, @mentions. Mode roller selects ASSIGN / ASK; Enter
 * ships the prompt as a task on the currently selected blank bundle.
 *
 * v3 Responsive: mode dial is mounted inside a single bevelled bar
 * with the prompt + ship button — wraps cleanly at narrow widths.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import type { AgentPresence } from '@cookrew/shared'
import { createTask } from '@/lib/api'
import { CrChip, CrLED } from './cr-chrome'
import { ModeRoller, type ComposerMode } from './mode-roller'

const SLASH_COMMANDS: Array<{ cmd: string; desc: string; icon: string }> = [
  { cmd: '/task', desc: 'Add a task to the current bundle', icon: '◆' },
  { cmd: '/claim', desc: 'Force-claim an open quest', icon: '♦' },
  { cmd: '/digest', desc: 'Summarize a session', icon: '▤' },
  { cmd: '/replay', desc: 'Replay a digest as new bundle', icon: '▷' },
  { cmd: '/spawn', desc: 'Spawn an agent on a quest', icon: '✦' },
]

export function ComposerDock({
  bundleId,
  agents,
  online,
  progress,
  onTaskCreated,
  disabled,
  variant = 'desktop',
}: {
  bundleId: string | null
  agents: readonly AgentPresence[]
  online: number
  progress: { done: number; total: number; events: number }
  onTaskCreated?: () => void
  disabled?: boolean
  variant?: 'mobile' | 'desktop'
}) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<ComposerMode>('assign')
  const [menu, setMenu] = useState<'slash' | 'mention' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = variant === 'mobile'

  const placeholder =
    mode === 'ask'
      ? 'clarify before adding work · ⏎ to ask'
      : 'add a task to this bundle · "/" · "@" · ⏎ to ship'

  const lastToken = (v: string) => v.split(/\s/).pop() || ''

  const mentionFilter = lastToken(text).slice(1).toLowerCase()
  const mentions = agents
    .filter((a) => a.status !== 'offline')
    .map((a) => ({
      handle: a.agent_id.split('@')[0],
      sub: `${a.display_name} · ${a.capabilities.length} caps`,
      status: a.status,
    }))
    .filter(
      (m) =>
        !mentionFilter || m.handle.toLowerCase().startsWith(mentionFilter),
    )

  const slashFilter = lastToken(text)
  const slashes = SLASH_COMMANDS.filter((c) =>
    c.cmd.startsWith(slashFilter || '/'),
  )

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    const last = lastToken(v)
    if (last.startsWith('/')) setMenu('slash')
    else if (last.startsWith('@')) setMenu('mention')
    else setMenu(null)
  }

  const insertToken = (tok: string) => {
    const parts = text.split(/\s/)
    parts[parts.length - 1] = tok + ' '
    setText(parts.join(' '))
    setMenu(null)
    textRef.current?.focus()
  }

  const ship = async () => {
    const raw = text.trim()
    if (!raw || submitting) return
    if (mode !== 'assign') {
      // ASK isn't wired to a backend API yet;
      // surface a friendly notice instead of silently dropping input.
      setError(`${mode.toUpperCase()} mode is not wired up yet`)
      return
    }
    if (!bundleId) {
      setError('Create or select a bundle first')
      return
    }
    const title = raw.replace(/^\/task\s+/, '').trim()
    if (!title) return
    setSubmitting(true)
    setError(null)
    try {
      await createTask(bundleId, { title })
      setText('')
      onTaskCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ship task')
    } finally {
      setSubmitting(false)
    }
  }

  // Clear the "not wired yet" error when the user switches back to ASSIGN.
  useEffect(() => {
    if (mode === 'assign') setError(null)
  }, [mode])

  const insets =
    typeof window !== 'undefined' && window.CR_DEVICE_INSETS
      ? window.CR_DEVICE_INSETS
      : { top: 0, bottom: 0, left: 0, right: 0 }
  const padLeft = isMobile
    ? `calc(12px + ${insets.left}px + env(safe-area-inset-left, 0px))`
    : 18
  const padRight = isMobile
    ? `calc(12px + ${insets.right}px + env(safe-area-inset-right, 0px))`
    : 18
  const padBottom = isMobile
    ? `calc(${insets.bottom}px + env(safe-area-inset-bottom, 0px))`
    : 14

  return (
    <footer
      className="cr"
      style={{
        position: 'relative',
        borderTop: '2px solid var(--line)',
        background: 'var(--cream-hi)',
        padding: isMobile ? '10px 12px 0' : '12px 18px',
        paddingLeft: padLeft,
        paddingRight: padRight,
        paddingBottom: padBottom,
        flexShrink: 0,
        zIndex: 70,
      }}
    >
      <div style={{ position: 'relative' }}>
        {menu === 'slash' && slashes.length > 0 && (
          <div
            className="cr-bevel"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 6,
              maxHeight: 220,
              overflowY: 'auto',
              zIndex: 10,
              padding: 4,
              background: 'var(--cream-hi)',
            }}
          >
            <div
              className="cr-kicker"
              style={{
                fontSize: 8,
                padding: '6px 10px',
                borderBottom: '1.5px solid var(--line-soft)',
              }}
            >
              SLASH COMMANDS
            </div>
            {slashes.map((s) => (
              <button
                key={s.cmd}
                type="button"
                onClick={() => insertToken(s.cmd)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span
                  className="cr-mono"
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {s.cmd}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {menu === 'mention' && mentions.length > 0 && (
          <div
            className="cr-bevel"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 6,
              maxHeight: 240,
              overflowY: 'auto',
              zIndex: 10,
              padding: 4,
              background: 'var(--cream-hi)',
            }}
          >
            <div
              className="cr-kicker"
              style={{
                fontSize: 8,
                padding: '6px 10px',
                borderBottom: '1.5px solid var(--line-soft)',
              }}
            >
              PARTY · MENTION
            </div>
            {mentions.map((m) => {
              const dot =
                m.status === 'busy'
                  ? 'var(--amber)'
                  : m.status === 'online'
                    ? '#4a8e3a'
                    : 'var(--muted)'
              return (
                <button
                  key={m.handle}
                  type="button"
                  onClick={() => insertToken('@' + m.handle)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      border: '1.5px solid var(--line)',
                      background: 'var(--cream)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily:
                        "var(--font-silkscreen), 'Silkscreen', monospace",
                    }}
                  >
                    {m.handle.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="cr-mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    @{m.handle}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.sub}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dot,
                      flexShrink: 0,
                    }}
                  />
                </button>
              )
            })}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            border: '2px solid var(--line)',
            background: 'var(--cream-hi)',
            boxShadow: '2px 2px 0 var(--line)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              borderRight: '1.5px solid var(--line)',
              background: 'var(--cream-md)',
              flexShrink: 0,
            }}
          >
            <ModeRoller value={mode} onChange={setMode} variant={variant} />
          </div>

          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                flex: 1,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setMenu(menu === 'slash' ? null : 'slash')}
                title="slash commands"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '0 10px',
                  fontFamily:
                    "var(--font-silkscreen), 'Silkscreen', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    menu === 'slash' ? 'var(--amber-deep)' : 'var(--muted)',
                  flexShrink: 0,
                  alignSelf: 'stretch',
                }}
              >
                /
              </button>
              <textarea
                ref={textRef}
                value={text}
                onChange={onChange}
                rows={1}
                disabled={disabled || submitting}
                placeholder={disabled ? 'create/select a bundle first…' : placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void ship()
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  alignSelf: 'stretch',
                  border: 'none',
                  background: 'transparent',
                  padding: isMobile ? '12px 10px 12px 0' : '14px 12px 14px 0',
                  fontFamily:
                    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'var(--ink)',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => void ship()}
                disabled={disabled || submitting || !text.trim()}
                title="ship ⏎"
                style={{
                  width: isMobile ? 56 : 92,
                  flexShrink: 0,
                  border: 'none',
                  borderLeft: '1.5px solid var(--line)',
                  background: text.trim() ? 'var(--amber)' : 'var(--cream-md)',
                  color: text.trim() ? '#1A1408' : 'var(--muted)',
                  fontFamily:
                    "var(--font-silkscreen), 'Silkscreen', monospace",
                  fontSize: isMobile ? 14 : 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  cursor:
                    submitting || !text.trim() ? 'default' : 'pointer',
                  transition: 'background 120ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {submitting ? '…' : isMobile ? '▶' : (
                  <>
                    <span>SHIP</span>
                    <span>▶</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1.5px dashed var(--line-soft)',
          }}
        >
          <CrLED state="on" />
          <span
            className="cr-mono"
            style={{ fontSize: 10, color: 'var(--muted)' }}
          >
            {online} AGENT{online === 1 ? '' : 'S'} READY
            {progress.total > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--amber-deep)', fontWeight: 700 }}>
                  {progress.done}/{progress.total}
                </span>{' '}
                CLEARED
              </>
            )}
          </span>
          <span style={{ flex: 1 }} />
          {error && (
            <CrChip tone="rose" style={{ fontSize: 9 }}>
              ⚠ {error.slice(0, 60)}
            </CrChip>
          )}
          <CrChip tone="slate">⌘K SLASH</CrChip>
          <CrChip tone="slate">@ MENTION</CrChip>
          <CrChip tone="slate">↵ SHIP</CrChip>
        </div>
      )}
    </footer>
  )
}
