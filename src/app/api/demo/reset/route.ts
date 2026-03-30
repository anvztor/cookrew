import { NextResponse } from 'next/server'
import { resetDemoState } from '@/lib/server/demo-store'

export async function POST() {
  resetDemoState()
  return NextResponse.json({ ok: true })
}

export async function GET() {
  resetDemoState()
  return NextResponse.json({ ok: true })
}
