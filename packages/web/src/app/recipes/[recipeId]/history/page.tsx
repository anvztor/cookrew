import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ recipeId: string }>
}

/**
 * Legacy route — the history is now a pop-out inside the workspace.
 * Preserve direct links by redirecting.
 */
export default async function RecipeHistoryPage({ params }: PageProps) {
  const { recipeId } = await params
  redirect(`/recipes/${recipeId}?popout=history`)
}
