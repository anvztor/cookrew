/**
 * ComposerDock — always-on bottom arcade cabinet input.
 *
 * Slash commands, @mentions. Mode roller selects SEED BUNDLE / SEED
 * TASK / ASK ORACLE; Enter ships the prompt for SEED BUNDLE (other
 * modes are visual-only until backend support lands).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import type { AgentPresence } from '@cookrew/shared'
import { createBundle } from '@/lib/api'
import { PixelBtn } from './pixel-chrome'
import { ModeRoller, type ComposerMode } from './mode-roller'

const SLASH_COMMANDS: Array<{ cmd: string; desc: string; icon: string }> = [
  { cmd: '/bundle', desc: 'Start a new bundle from a prompt', icon: '▷' },
  { cmd: '/rerun', desc: 'Re-run the current blocked bundle', icon: '↻' },
  { cmd: '/digest', desc: 'Submit current bundle for review', icon: '▣' },
  { cmd: '/cancel', desc: 'Cancel the active bundle', icon: '✕' },
  { cmd: '/status', desc: 'Print recipe + agent status snapshot', icon: '▦' },
]

export function ComposerDock({
  recipeId,
  requestedBy,
  agents,
  online,
  progress,
  onBundleCreated,
  disabled,
  onAgentsClick,
  onEventsClick,
  eventsOpen,
}: {
  recipeId: string
  requestedBy: string
  agents: readonly AgentPresence[]
  online: number
  progress: { done: number; total: number; events: number }
  onBundleCreated: (bundleId: string) => void
  disabled?: boolean
  onAgentsClick?: () => void
  onEventsClick?: () => void
  eventsOpen?: boolean
}) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<ComposerMode>('seed')
  const [showMenu, setShowMenu] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const placeholder =
    mode === 'ask'
      ? 'ask the oracle · facts · digests · recipe history · ⏎ to query'
      : mode === 'task'
        ? 'describe a task · "/" for commands · "@" to mention · ⏎ to ship'
        : 'seed a bundle · "/" for commands · "@" to mention · ⏎ to ship'

  const mentions = [
    ...agents.map((a) => ({
      tag: '@' + a.agent_id.split('@')[0],
      kind: 'agent' as const,
      desc: `${a.display_name} · ${a.capabilities.length} caps`,
    })),
    { tag: '@party', kind: 'broadcast' as const, desc: 'all online agents' },
  ]

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    const last = v.split(/\s/).pop() || ''
    setShowMenu(last.startsWith('/'))
    setShowMentions(last.startsWith('@'))
  }

  const insertCmd = (cmd: string) => {
    const parts = text.split(/\s/)
    parts[parts.length - 1] = cmd + ' '
    setText(parts.join(' '))
    setShowMenu(false)
    textRef.current?.focus()
  }

  const ship = async () => {
    const raw = text.trim()
    if (!raw || submitting) return
    if (mode !== 'seed') {
      // SEED TASK / ASK ORACLE aren't wired to backend APIs yet;
      // surface a friendly notice instead of silently dropping input.
      setError(`${mode.toUpperCase()} mode is not wired up yet`)
      return
    }
    const prompt = raw.replace(/^\/bundle\s+/, '').trim()
    if (!prompt) return
    setSubmitting(true)
    setError(null)
    try {
      const { bundle_id } = await createBundle(recipeId, {
        prompt,
        requested_by: requestedBy,
        task_titles: [],
      })
      setText('')
      onBundleCreated(bundle_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ship bundle')
    } finally {
      setSubmitting(false)
    }
  }

  // Clear the "not wired yet" error when the user switches back to seed.
  useEffect(() => {
    if (mode === 'seed') setError(null)
  }, [mode])

  return (
    <div
      style={{
        position: 'relative',
        borderTop: '3px solid var(--line)',
        background: 'var(--cream-hi)',
        padding: '10px 16px 12px',
        flexShrink: 0,
        boxShadow: 'inset 0 2px 0 var(--cream-hi), inset 0 4px 0 rgba(0,0,0,0.05)',
        zIndex: 70,
      }}
    >
      {/* Slash menu */}
      {showMenu && (
        <div
          className="pc-bevel"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: '100%',
            marginBottom: 6,
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 80,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '2px solid var(--line)',
              background: 'var(--amber-soft)',
            }}
          >
            <div className="pc-silk" style={{ fontSize: 9 }}>
              ▸ SLASH COMMANDS
            </div>
          </div>
          {SLASH_COMMANDS.filter((c) =>
            c.cmd.startsWith(text.split(/\s/).pop() || '/'),
          ).map((c) => (
            <button
              key={c.cmd}
              type="button"
              onClick={() => insertCmd(c.cmd)}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 110px 1fr',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 0,
                borderBottom: '1px dashed var(--line-soft)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                className="pc-silk"
                style={{ color: 'var(--amber-deep)', fontSize: 14 }}
              >
                {c.icon}
              </span>
              <span
                className="pc-mono"
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}
              >
                {c.cmd}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mention menu */}
      {showMentions && (
        <div
          className="pc-bevel"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: '100%',
            marginBottom: 6,
            zIndex: 80,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '2px solid var(--line)',
              background: 'var(--violet-soft)',
            }}
          >
            <div className="pc-silk" style={{ fontSize: 9 }}>
              ▸ MENTIONS · @
            </div>
          </div>
          {mentions.map((m) => (
            <div
              key={m.tag}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 70px',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderBottom: '1px dashed var(--line-soft)',
                fontSize: 12,
              }}
            >
              <span
                className="pc-mono"
                style={{ fontWeight: 700, color: 'var(--violet-ink)' }}
              >
                {m.tag}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>{m.desc}</span>
              <span className="pc-chip slate" style={{ fontSize: 7, justifySelf: 'end' }}>
                {m.kind}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top row — clickable chips: agents (toggle sidebar) · spacer · events (toggle feed) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <button
          type="button"
          className="pc-chip phos"
          onClick={(e) => {
            e.stopPropagation()
            onAgentsClick?.()
          }}
          title="show / hide agent sidebar"
          style={{
            fontSize: 8,
            cursor: 'pointer',
            border: 'none',
            padding: '3px 8px',
            fontFamily: 'inherit',
            letterSpacing: 'inherit',
          }}
        >
          ◉ {online} AGENTS READY
        </button>
        {error && (
          <div
            className="pc-chip rose"
            style={{ fontSize: 9 }}
            title={error}
          >
            ⚠ {error.slice(0, 60)}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="pc-chip phos"
          onClick={(e) => {
            e.stopPropagation()
            onEventsClick?.()
          }}
          title={eventsOpen ? 'hide krewhub feed' : 'show krewhub feed'}
          style={{
            fontSize: 8,
            cursor: 'pointer',
            border: 'none',
            padding: '3px 8px',
            fontFamily: 'inherit',
            letterSpacing: 'inherit',
            opacity: eventsOpen === false ? 0.55 : 1,
          }}
        >
          ▤ {progress.events} EVENTS TRACED
        </button>
      </div>

      {/* Cabinet input */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          alignItems: 'stretch',
          gap: 0,
          border: '2px solid var(--line)',
          boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1), 4px 4px 0 var(--line)',
          background: 'var(--cream-hi)',
        }}
      >
        <ModeRoller value={mode} onChange={setMode} />

        <textarea
          ref={textRef}
          value={text}
          onChange={onChange}
          rows={1}
          disabled={disabled || submitting}
          placeholder={disabled ? 'loading recipe…' : placeholder}
          style={{
            resize: 'none',
            border: 0,
            outline: 0,
            padding: '14px 14px',
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
            background: 'transparent',
            minHeight: 44,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ship()
            }
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 10px',
            borderLeft: '2px solid var(--line)',
          }}
        >
          <PixelBtn variant="ghost" size="tiny" title="attach code ref">
            📎
          </PixelBtn>
          <PixelBtn variant="ghost" size="tiny" title="attach fact">
            §
          </PixelBtn>
        </div>

        <button
          type="button"
          onClick={() => void ship()}
          disabled={disabled || submitting || !text.trim()}
          style={{
            border: 0,
            borderLeft: '2px solid var(--line)',
            background: submitting ? 'var(--dim)' : 'var(--amber-deep)',
            color: '#fff',
            padding: '0 20px',
            fontFamily: "var(--font-press-start-2p), 'Press Start 2P', monospace",
            fontSize: 11,
            letterSpacing: 1,
            cursor: submitting ? 'wait' : 'pointer',
            boxShadow:
              'inset 1px 1px 0 rgba(255,255,255,0.35), inset -2px -2px 0 rgba(0,0,0,0.2)',
            opacity: disabled || !text.trim() ? 0.6 : 1,
          }}
        >
          {submitting ? '…' : 'SHIP ▶'}
        </button>
      </div>

      {/* Hints row — quest progress lives here now (was top-right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 8,
          fontSize: 10,
          color: 'var(--muted)',
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        <span>
          <kbd style={kbdS}>/</kbd> commands
        </span>
        <span>
          <kbd style={kbdS}>@</kbd> mentions
        </span>
        <span>
          <kbd style={kbdS}>⇧⏎</kbd> newline
        </span>
        <span>
          <kbd style={kbdS}>⏎</kbd> ship
        </span>
        <div style={{ flex: 1 }} />
        <span className="pc-mono" style={{ color: 'var(--muted)' }}>
          {progress.total > 0 ? (
            <>
              QUESTS{' '}
              <span style={{ color: 'var(--amber-deep)', fontWeight: 700 }}>
                {progress.done}/{progress.total}
              </span>
            </>
          ) : (
            <span>no quests yet</span>
          )}
        </span>
        <div
          style={{
            width: 80,
            height: 6,
            background: 'var(--cream-md)',
            border: '1.5px solid var(--line)',
          }}
          title="bundle completion"
        >
          <div
            style={{
              height: '100%',
              width:
                progress.total > 0
                  ? `${Math.min(100, (progress.done / progress.total) * 100)}%`
                  : '0%',
              background: 'var(--xp)',
              transition: 'width 300ms linear',
            }}
          />
        </div>
      </div>
    </div>
  )
}

const kbdS: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
  fontSize: 10,
  border: '1px solid var(--line-soft)',
  padding: '1px 5px',
  background: 'var(--cream-md)',
  color: 'var(--ink)',
}
