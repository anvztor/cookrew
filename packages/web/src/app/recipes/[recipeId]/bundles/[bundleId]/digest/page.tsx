import { DigestReviewScreen } from '@/components/digest-review-screen'

interface PageProps {
  params: Promise<{ recipeId: string; bundleId: string }>
}

export default async function DigestPage({ params }: PageProps) {
  const { recipeId, bundleId } = await params
  return <DigestReviewScreen recipeId={recipeId} bundleId={bundleId} />
}
