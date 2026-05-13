import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getForumPosts, searchForumPosts, getLatestMarketIndices, marketQueryKeys } from '@/lib/supabase/marketQueries'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/useDebounce'

export function useMarketData({ viewType }: { viewType: 'mobile' | 'desktop' }) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [page, setPage] = useState(1)
  const limit = 30

  const { data: indices, isLoading: indicesLoading } = useQuery({
    queryKey: marketQueryKeys.marketIndices(),
    queryFn: getLatestMarketIndices,
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60 * 5,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)

  // ── 데스크탑: 숫자 페이징 (useQuery) ──────────────────────────
  const { data: desktopData, isLoading: desktopLoading } = useQuery({
    queryKey: debouncedQuery 
      ? ['searchForumPosts', 'fmkorea_stock', debouncedQuery, 'desktop', page]
      : [...marketQueryKeys.forumPosts('fmkorea_stock'), 'desktop', page],
    queryFn: () => 
      debouncedQuery
        ? searchForumPosts({ source: 'fmkorea_stock', query: debouncedQuery, limit, page })
        : getForumPosts({ source: 'fmkorea_stock', limit, page }),
    enabled: viewType === 'desktop',
    staleTime: 1000 * 60 * 5,
  })

  // ── 모바일: 무한 스크롤 (useInfiniteQuery) ──────────────────────
  const { 
    data: mobileData, 
    isLoading: mobileLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: debouncedQuery 
      ? ['searchForumPosts', 'fmkorea_stock', debouncedQuery, 'mobile']
      : [...marketQueryKeys.forumPosts('fmkorea_stock'), 'mobile'],
    queryFn: ({ pageParam }) => 
      debouncedQuery
        ? searchForumPosts({ source: 'fmkorea_stock', query: debouncedQuery, limit, cursor: pageParam })
        : getForumPosts({ source: 'fmkorea_stock', limit, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: viewType === 'mobile',
    staleTime: 1000 * 60 * 5,
  })

  // 🔴 뷰 타입에 따른 데이터 병합
  const posts = viewType === 'desktop' 
    ? desktopData?.items ?? []
    : mobileData?.pages.flatMap((p) => p.items) ?? []

  const totalCount = viewType === 'desktop' ? (desktopData?.totalCount ?? 0) : 0
  const postsLoading = viewType === 'desktop' ? desktopLoading : mobileLoading

  // 🔴 Supabase Realtime 구독 (DB가 변경되면 즉시 무효화하여 새로운 데이터를 가져옴)
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('market-radar-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'forum_posts',
        },
        (payload) => {
          console.log('Realtime Update Received!', payload)
          // DB 변경이 감지되면 forumPosts 쿼리를 무효화하여 즉시 refetch 발생
          queryClient.invalidateQueries({
            queryKey: marketQueryKeys.forumPosts('fmkorea_stock'),
          })
          setLastUpdated(new Date())
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetch('/api/cron/scrape')
      await queryClient.invalidateQueries({
        queryKey: marketQueryKeys.forumPosts('fmkorea_stock'),
      })
      setLastUpdated(new Date())
    } catch (e) {
      console.error('새로고침 실패:', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient])

  // 검색어 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  return {
    indices,
    indicesLoading,
    posts,
    postsLoading,
    totalCount,
    page,
    setPage,
    limit,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefreshing,
    lastUpdated,
    handleRefresh,
    searchQuery,
    setSearchQuery,
  }
}
