'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCookbookDetailData } from '@/lib/api'

/**
 * Client-side redirect for legacy /cookbooks/[id] links.
 *
 * Fetches the cookbook detail to find the first recipe, then
 * replaces the URL with /recipes/{firstRecipe}?popout=cookbook.
 * No-recipe cookbooks redirect to /.
 */
export function CookbookRedirect({ cookbookId }: { cookbookId: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const detail = await getCookbookDetailData(cookbookId)
        const first = detail.recipes[0]?.recipe
        if (cancelled) return
        if (first) {
          router.replace(`/recipes/${first.id}?popout=cookbook`)
        } else {
          router.replace('/')
        }
      } catch {
        if (!cancelled) router.replace('/')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cookbookId, router])

  return (
    <div
      className="ap-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--muted)',
        fontFamily: "var(--font-silkscreen), 'Silkscreen', monospace",
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      ▸ REDIRECTING TO WORKSPACE…
    </div>
  )
}
