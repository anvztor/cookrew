export function generateTaskSeeds(prompt: string): string[] {
  const cleaned = prompt.replace(/\s+/g, ' ').trim()
  const excerpt = cleaned.slice(0, 48).replace(/[.?!]+$/, '')
  const subject = excerpt || 'the requested bundle'

  return [
    `Scope and plan ${subject}`,
    `Implement ${subject}`,
    `Review and digest ${subject}`,
  ]
}

export function normalizeTaskSeeds(value: readonly string[]): string[] {
  return value
    .map((entry) => entry.trim())
    .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index)
}
