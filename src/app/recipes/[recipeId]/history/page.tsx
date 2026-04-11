import { HistoryScreen } from '@/components/history-screen'

interface PageProps {
  params: Promise<{ recipeId: string }>
}

export default async function RecipeHistoryPage({ params }: PageProps) {
  const { recipeId } = await params
  return <HistoryScreen recipeId={recipeId} />
}
