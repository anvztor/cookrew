import type { Repo, Cooker, ChatMessage, Bundle } from '@/types'

export const MOCK_REPOS: readonly Repo[] = [
  { id: 'core', name: 'platform/core', icon: 'folder-git-2' },
  { id: 'web', name: 'platform/web', icon: 'folder-git-2' },
  { id: 'mobile', name: 'platform/mobile', icon: 'folder-git-2' },
] as const

export const MOCK_COOKERS: readonly Cooker[] = [
  {
    id: 'nia',
    emoji: '\u{1F9D1}\u200D\u{1F4BC}',
    displayName: 'Nia (Publisher)',
    action: 'Added Agent Pack A \u2022 Orchestration permissions: Full',
  },
  {
    id: 'leo',
    emoji: '\u{1F9D1}\u200D\u{1F3A8}',
    displayName: 'Leo (Encourager)',
    action: 'Attached +120 reward to TASK-134 \u2022 Watcher role',
  },
  {
    id: 'specwriter',
    emoji: '\u{1F916}',
    displayName: 'SpecWriter-01',
    action: 'Drafting task specs from orchestrator prompts',
  },
  {
    id: 'planner',
    emoji: '\u{1F431}',
    displayName: 'Planner-Delta',
    action: 'Scheduling dependencies + delegating work to shared agents',
  },
  {
    id: 'mina',
    emoji: '\u{1F9D1}\u200D\u{1F52C}',
    displayName: 'Mina (Encourager)',
    action: 'Added +60 bounty to TASK-140 for test coverage',
  },
  {
    id: 'reviewfox',
    emoji: '\u{1F98A}',
    displayName: 'ReviewFox-AI',
    action: 'Reviewing merged outputs before publisher approval',
  },
] as const

export const MOCK_MESSAGES: readonly ChatMessage[] = [
  {
    id: 'm1',
    bundleId: 'bundle-c',
    bundleTag: 'Bundle C',
    timestamp: '09:58',
    emoji: '\u{1F9D1}\u200D\u{1F4BC}',
    sender: 'Nia (Publisher)',
    content: 'Generate release workflow with named tasks and dependencies.',
    tone: 'primary',
  },
  {
    id: 'm2',
    bundleId: 'bundle-c',
    timestamp: '10:03',
    emoji: '\u{1F916}',
    sender: 'Orchestrator',
    content: 'Created workflow graph from Editorial Brief to Publish Draft.',
    tone: 'secondary',
  },
  {
    id: 'm3',
    bundleId: 'bundle-b',
    bundleTag: 'Bundle B',
    timestamp: '10:10',
    emoji: '\u{1F9D1}\u200D\u{1F3A8}',
    sender: 'Leo (Encourager)',
    content: 'Added sponsor reward to Fact Check Pack to speed review.',
    tone: 'secondary',
  },
  {
    id: 'm4',
    bundleId: 'bundle-b',
    timestamp: '10:14',
    emoji: '\u2705',
    sender: 'Deployer-Bot',
    content: 'Citation Merge completed and passed to Publish Draft.',
    tone: 'secondary',
  },
  {
    id: 'm5',
    bundleId: 'bundle-a',
    timestamp: '10:19',
    emoji: '\u{1F431}',
    sender: 'Planner-Delta',
    content: 'Started Brand QA after Legal Review completed.',
    tone: 'secondary',
  },
  {
    id: 'm6',
    bundleId: 'bundle-a',
    bundleTag: 'Bundle A',
    timestamp: '10:24',
    emoji: '\u{1F916}',
    sender: 'ReviewFox-AI',
    content: 'Requested final human approval on Publish Draft.',
    tone: 'secondary',
  },
] as const

export const MOCK_BUNDLES: readonly Bundle[] = [
  {
    id: 'bundle-c',
    title: 'Create Spec',
    taskCount: 4,
    sponsorCount: 1,
    opacity: 0.88,
    isActive: false,
    tasks: [
      { id: 'ct1', label: 'Frontend Spec \u00b7 done', tone: 'emerald' },
      { id: 'ct2', label: 'Backend Spec \u00b7 done', tone: 'emerald' },
    ],
  },
  {
    id: 'bundle-b',
    title: 'Up Next',
    taskCount: 1,
    sponsorCount: 3,
    opacity: 0.94,
    isActive: false,
    tasks: [
      { id: 'bt1', label: 'Write Readme \u00b7 done', tone: 'emerald' },
    ],
  },
  {
    id: 'bundle-a',
    title: 'Growth Launch',
    taskCount: 4,
    sponsorCount: 2,
    opacity: 1,
    isActive: true,
    tasks: [
      { id: 'at1', label: 'Editorial Brief \u00b7 created', tone: 'slate' },
      { id: 'at2', label: 'Source Research \u00b7 claimed', tone: 'amber' },
      { id: 'at3', label: 'Fact Check Pack \u00b7 in_progress', tone: 'blue' },
      { id: 'at4', label: 'Publish Draft \u00b7 done', tone: 'emerald' },
    ],
    workflow: {
      nodes: [
        { id: 'S', label: 'S' },
        { id: 'A', label: 'Editorial' },
        { id: 'B', label: 'Legal' },
        { id: 'C', label: 'Research' },
        { id: 'D', label: 'Draft' },
        { id: 'E', label: 'E' },
      ],
      edges: [
        { from: 'S', to: 'A' },
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'E' },
      ],
    },
  },
] as const
