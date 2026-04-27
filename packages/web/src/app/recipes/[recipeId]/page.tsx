import { ArcadeWorkspace } from '@/components/arcade-workspace'

interface PageProps {
  params: Promise<{ recipeId: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const { recipeId } = await params
  return <ArcadeWorkspace recipeId={recipeId} />
}
