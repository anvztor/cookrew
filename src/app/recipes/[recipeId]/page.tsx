import { WorkspaceScreen } from '@/components/workspace-screen'

interface PageProps {
  params: Promise<{ recipeId: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const { recipeId } = await params
  return <WorkspaceScreen recipeId={recipeId} />
}
