import { CookbookRedirect } from './redirect'

interface PageProps {
  params: Promise<{ cookbookId: string }>
}

/**
 * Legacy route — cookbook view is now a pop-out inside the workspace.
 * This page fetches the cookbook's first recipe and redirects to
 * /recipes/{firstRecipe}?popout=cookbook. Falls back to home if the
 * cookbook is empty or the fetch fails.
 */
export default async function CookbookPage({ params }: PageProps) {
  const { cookbookId } = await params
  return <CookbookRedirect cookbookId={cookbookId} />
}
