import { CookbookDetailScreen } from '@/components/cookbook-detail-screen'

interface PageProps {
  params: Promise<{ cookbookId: string }>
}

export default async function CookbookPage({ params }: PageProps) {
  const { cookbookId } = await params
  return <CookbookDetailScreen cookbookId={cookbookId} />
}
