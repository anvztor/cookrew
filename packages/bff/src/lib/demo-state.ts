/**
 * Shared demo state infrastructure: read/write the JSON file, clone helper, ID generation.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  AgentPresence,
  Bundle,
  Digest,
  Event,
  Recipe,
  RecipeMember,
  Task,
} from '@cookrew/shared'

export interface DemoState {
  recipes: Recipe[]
  members: RecipeMember[]
  agents: AgentPresence[]
  bundles: Bundle[]
  tasks: Task[]
  events: Event[]
  digests: Digest[]
}

const STORE_PATH = join(process.cwd(), 'data', 'demo-store.json')

export function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createInitialState(): DemoState {
  return {
    recipes: [],
    members: [],
    agents: [],
    bundles: [],
    tasks: [],
    events: [],
    digests: [],
  }
}

export function readState(): DemoState {
  if (!existsSync(STORE_PATH)) {
    const initialState = createInitialState()
    writeState(initialState)
    return initialState
  }

  return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DemoState
}

export function writeState(state: DemoState): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(state, null, 2))
}

export function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
