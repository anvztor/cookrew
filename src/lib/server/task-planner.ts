/**
 * Task planner: decomposes a prompt into tasks with dependencies.
 *
 * This is the local fallback when no orchestrator agent is available.
 * It uses heuristic keyword matching to generate meaningful tasks
 * with a dependency graph. When an orchestrator agent IS available,
 * the plan route will call it via A2A instead.
 */

export interface PlannedTask {
  readonly title: string
  readonly description: string
  readonly dependsOn: number[] // indices into the tasks array
}

/**
 * Decompose a prompt into tasks with dependencies.
 *
 * The output is ordered: tasks that depend on others come later.
 * dependsOn contains indices into the returned array.
 */
export function planTasksFromPrompt(prompt: string): PlannedTask[] {
  const lower = prompt.toLowerCase()

  // Detect intent patterns
  const isRefactor = /refactor|restructure|reorganize|migrate|rewrite/.test(lower)
  const isFeature = /add|implement|create|build|develop|ship/.test(lower)
  const isBugfix = /fix|debug|resolve|patch|repair/.test(lower)
  const isReview = /review|audit|check|analyze|assess/.test(lower)
  const isTest = /test|coverage|spec|e2e|playwright/.test(lower)

  const excerpt = prompt.replace(/\s+/g, ' ').trim().slice(0, 60).replace(/[.?!]+$/, '')
  const subject = excerpt || 'the requested changes'

  if (isRefactor) {
    return [
      {
        title: `Analyze current structure for: ${subject}`,
        description: 'Map the existing code, identify coupling points and migration risks.',
        dependsOn: [],
      },
      {
        title: `Plan the refactoring approach`,
        description: 'Design the target architecture, define migration steps, identify breaking changes.',
        dependsOn: [0],
      },
      {
        title: `Implement the refactoring`,
        description: 'Execute the planned changes incrementally, keeping tests green.',
        dependsOn: [1],
      },
      {
        title: `Update tests and verify`,
        description: 'Ensure all tests pass, add missing coverage for refactored code.',
        dependsOn: [2],
      },
      {
        title: `Review and document changes`,
        description: 'Final code review, update documentation and migration notes.',
        dependsOn: [2, 3],
      },
    ]
  }

  if (isFeature) {
    return [
      {
        title: `Scope and plan: ${subject}`,
        description: 'Define requirements, identify affected files, plan implementation approach.',
        dependsOn: [],
      },
      {
        title: `Implement core logic`,
        description: 'Build the main functionality with proper error handling.',
        dependsOn: [0],
      },
      {
        title: `Write tests`,
        description: 'Add unit and integration tests for the new functionality.',
        dependsOn: [1],
      },
      {
        title: `Wire into existing system`,
        description: 'Connect to routes, UI, or other integration points.',
        dependsOn: [1],
      },
      {
        title: `Review and finalize`,
        description: 'Code review, verify all tests pass, check for edge cases.',
        dependsOn: [2, 3],
      },
    ]
  }

  if (isBugfix) {
    return [
      {
        title: `Reproduce and diagnose: ${subject}`,
        description: 'Reproduce the bug, identify root cause, trace the code path.',
        dependsOn: [],
      },
      {
        title: `Write a failing test`,
        description: 'Create a test that captures the bug behavior.',
        dependsOn: [0],
      },
      {
        title: `Implement the fix`,
        description: 'Fix the root cause with minimal changes.',
        dependsOn: [1],
      },
      {
        title: `Verify fix and check for regressions`,
        description: 'Run the full test suite, verify the fix resolves the issue.',
        dependsOn: [2],
      },
    ]
  }

  if (isReview || isTest) {
    return [
      {
        title: `Analyze scope: ${subject}`,
        description: 'Identify what needs to be reviewed or tested.',
        dependsOn: [],
      },
      {
        title: `Execute the analysis`,
        description: 'Run the review, audit, or test suite.',
        dependsOn: [0],
      },
      {
        title: `Compile findings and recommendations`,
        description: 'Summarize results, document issues found, suggest improvements.',
        dependsOn: [1],
      },
    ]
  }

  // Default: generic 3-step plan with dependencies
  return [
    {
      title: `Scope and plan: ${subject}`,
      description: 'Understand the request, explore the codebase, plan the approach.',
      dependsOn: [],
    },
    {
      title: `Implement: ${subject}`,
      description: 'Execute the planned changes.',
      dependsOn: [0],
    },
    {
      title: `Review and digest: ${subject}`,
      description: 'Verify the implementation, run tests, prepare the digest.',
      dependsOn: [1],
    },
  ]
}
