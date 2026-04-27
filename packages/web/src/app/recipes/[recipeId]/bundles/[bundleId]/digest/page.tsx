import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ recipeId: string; bundleId: string }>
}

/**
 * Legacy route — bundle review is now a pop-out inside the workspace.
 * Preserve direct links by redirecting.
 */
export default async function DigestPage({ params }: PageProps) {
  const { recipeId, bundleId } = await params
  redirect(`/recipes/${recipeId}?popout=review&bundle=${bundleId}`)
}
