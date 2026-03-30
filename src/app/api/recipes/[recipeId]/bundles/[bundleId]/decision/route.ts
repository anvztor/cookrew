import { NextResponse } from 'next/server'
import { decideDigest } from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string; bundleId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { recipeId, bundleId } = await context.params
    const body = (await request.json()) as {
      decision?: 'approved' | 'rejected'
      decidedBy?: string
      note?: string
    }

    if (!body.decision || !body.decidedBy?.trim()) {
      return NextResponse.json(
        { error: 'Decision and reviewer are required.' },
        { status: 400 }
      )
    }

    const digest = await decideDigest(bundleId, {
      decision: body.decision,
      decidedBy: body.decidedBy.trim(),
      note: body.note,
    })

    if (!digest) {
      return NextResponse.json(
        { error: 'Unable to record digest decision.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      redirectTo:
        body.decision === 'approved'
          ? `/recipes/${recipeId}/history`
          : `/recipes/${recipeId}/bundles/${bundleId}/digest`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save digest decision' },
      { status: 500 }
    )
  }
}
