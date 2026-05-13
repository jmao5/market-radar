import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { Suspense } from 'react'
import HomeClient from './HomeClient'
import Loading from '@/components/ui/Loading'
import getQueryClient from '@/lib/getQueryClient'
import { getLatestMarketIndices, getForumPosts, marketQueryKeys } from '@/lib/supabase/marketQueries'

export default async function HomePage() {
  const queryClient = getQueryClient()

  await Promise.all([
    // 시장 지수 — 모바일/데스크탑 공통
    queryClient.prefetchQuery({
      queryKey: marketQueryKeys.marketIndices(),
      queryFn: getLatestMarketIndices,
    }),
    // 데스크탑: 1페이지 숫자 페이징
    queryClient.prefetchQuery({
      queryKey: [...marketQueryKeys.forumPosts('fmkorea_stock'), 'desktop', 1],
      queryFn: () => getForumPosts({ source: 'fmkorea_stock', limit: 30, page: 1 }),
    }),
    // 모바일: 무한스크롤 첫 페이지
    queryClient.prefetchInfiniteQuery({
      queryKey: [...marketQueryKeys.forumPosts('fmkorea_stock'), 'mobile'],
      queryFn: ({ pageParam }) =>
        getForumPosts({ source: 'fmkorea_stock', limit: 30, cursor: pageParam as string | null }),
      initialPageParam: null,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading />}>
        <HomeClient />
      </Suspense>
    </HydrationBoundary>
  )
}
