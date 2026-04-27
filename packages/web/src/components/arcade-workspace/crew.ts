/**
 * Crew identity colors. A "crew" is the set of agents owned by the
 * same human operator (AgentPresence.owner_username). The colors are
 * assigned deterministically from the username so the same operator
 * always reads as the same color across sessions.
 */

export interface CrewColor {
  readonly id: string
  readonly color: string
  readonly soft: string
  readonly label: string
}

const PALETTE: ReadonlyArray<{ color: string; soft: string }> = [
  { color: '#E9B949', soft: 'rgba(233,185,73,0.16)' }, // amber
  { color: '#9B7BD4', soft: 'rgba(155,123,212,0.18)' }, // violet
  { color: '#6BBE58', soft: 'rgba(107,190,88,0.18)' }, // emerald
  { color: '#4AA3E6', soft: 'rgba(74,163,230,0.18)' }, // blue
  { color: '#E07B5C', soft: 'rgba(224,123,92,0.20)' }, // terracotta
  { color: '#5FA88A', soft: 'rgba(95,168,138,0.18)' }, // teal
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function crewColorFor(crewId: string | null): CrewColor | null {
  if (!crewId) return null
  const slot = PALETTE[hash(crewId) % PALETTE.length]
  return {
    id: crewId,
    color: slot.color,
    soft: slot.soft,
    label: crewId.toUpperCase(),
  }
}
