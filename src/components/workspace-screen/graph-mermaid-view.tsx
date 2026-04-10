'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Renders a krewhub-attached pydantic-graph as a mermaid flowchart, with
 * optional highlighting of the currently-running step.
 *
 * Mermaid is loaded lazily via dynamic import on first render so it stays
 * out of the initial JS bundle (mermaid is ~600KB minified). Re-renders
 * when `code` changes; highlighting is recomputed when `highlightedNodeId`
 * changes without re-running mermaid.render.
 *
 * Highlighting strategy: mermaid emits each flowchart node as an SVG `<g>`
 * with a `node` class and an id like `flowchart-{nodeId}-N` where N is an
 * internal counter. We walk the rendered SVG and add a `graph-node--running`
 * class to any `<g.node>` whose id contains `-{nodeId}-`. The class is
 * styled by the consuming page (cookrew global CSS or tailwind utility).
 */

interface GraphMermaidViewProps {
  /** Mermaid flowchart source code from `bundle.graphMermaid`. */
  readonly code: string
  /** Optional graph_node_id to highlight as currently running. */
  readonly highlightedNodeId?: string | null
  /** Extra classes for the wrapping <div>. */
  readonly className?: string
}

type RenderState =
  | { kind: 'loading' }
  | { kind: 'ready'; svg: string }
  | { kind: 'error'; message: string }

export function GraphMermaidView({
  code,
  highlightedNodeId,
  className,
}: GraphMermaidViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Stable id per mounted instance — mermaid requires a unique render id.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [state, setState] = useState<RenderState>({ kind: 'loading' })

  // Render the mermaid source whenever it changes.
  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        // Lazy import so mermaid stays out of the initial bundle.
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'default',
          flowchart: { htmlLabels: true, curve: 'basis' },
        })

        const renderId = `cookrew-mermaid-${uid}-${Date.now().toString(36)}`
        const result = await mermaid.render(renderId, code)
        if (cancelled) return
        setState({ kind: 'ready', svg: result.svg })
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : 'mermaid render failed'
        setState({ kind: 'error', message })
      }
    }

    setState({ kind: 'loading' })
    void render()

    return () => {
      cancelled = true
    }
  }, [code, uid])

  // Apply highlighting after the SVG has been injected. Re-runs when the
  // highlight target or rendered SVG changes — but does NOT re-run mermaid
  // itself, so it's cheap and doesn't trigger layout flicker.
  useEffect(() => {
    const container = containerRef.current
    if (container == null || state.kind !== 'ready') return

    const previouslyHighlighted = container.querySelectorAll(
      '.graph-node--running',
    )
    previouslyHighlighted.forEach((el) =>
      el.classList.remove('graph-node--running'),
    )

    if (highlightedNodeId == null || highlightedNodeId === '') return

    // Mermaid node ids look like `flowchart-{nodeId}-N`. Walk all <g> with
    // the `node` class and match by id substring; SVG ids must escape some
    // CSS-sensitive chars so prefer manual iteration over a CSS selector.
    const nodes = container.querySelectorAll<SVGGElement>('g.node')
    const target = `-${highlightedNodeId}-`
    nodes.forEach((node) => {
      const id = node.getAttribute('id') ?? ''
      if (id.includes(target)) {
        node.classList.add('graph-node--running')
      }
    })
  }, [highlightedNodeId, state])

  return (
    <div
      className={joinClasses(
        'w-full overflow-x-auto rounded-lg border border-slate-800/60 bg-slate-950/40 p-3',
        className,
      )}
    >
      {state.kind === 'loading' && (
        <div className="flex items-center justify-center py-8 text-xs text-slate-400">
          Loading graph…
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-200">
          <div className="font-semibold">Graph render failed</div>
          <div className="mt-1 font-mono opacity-80">{state.message}</div>
        </div>
      )}

      {state.kind === 'ready' && (
        <div
          ref={containerRef}
          className="cookrew-mermaid"
          // SVG is produced by mermaid.render — trusted output from a
          // trusted source (krewhub validates the upstream graph code via
          // its sandbox before rendering mermaid). securityLevel: 'strict'
          // is set in mermaid.initialize as defense in depth.
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
      )}
    </div>
  )
}

function joinClasses(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p)).join(' ')
}
