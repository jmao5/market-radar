import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getForumPosts, searchForumPosts, getLatestMarketIndices, marketQueryKeys } from '@/lib/supabase/marketQueries'
import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/useDebounce'
import { logger } from '@/lib/logger'

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

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. 로컬 상태로 검색어 관리 (입력 시 포커스 유지 및 자동 검색 방지)
  const [searchQuery, setSearchQuery] = useState('')

  // 2. URL에서 실제 활성화된 검색어 가져오기
  const urlSearchQuery = searchParams.get('search') ?? ''

  // 3. URL 변경 시 로컬 입력창 상태도 동기화 (예: 뒤로가기 등)
  useEffect(() => {
    setSearchQuery(urlSearchQuery)
  }, [urlSearchQuery])

  // 4. 엔터 입력 또는 돋보기 버튼 클릭 시 호출하여 URL 업데이트 및 검색 실행
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    } else {
      params.delete('search')
    }
    setPage(1)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchQuery, searchParams, pathname, router])

  // 5. 작성자 클릭 등 즉시 검색용 함수
  const handleInstantSearch = useCallback((query: string) => {
    setSearchQuery(query)
    const params = new URLSearchParams(searchParams.toString())
    if (query.trim()) {
      params.set('search', query.trim())
    } else {
      params.delete('search')
    }
    setPage(1)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  // ── 데스크탑: 숫자 페이징 (useQuery) ──────────────────────────
  const { data: desktopData, isLoading: desktopLoading } = useQuery({
    queryKey: urlSearchQuery
      ? ['searchForumPosts', 'fmkorea_stock', urlSearchQuery, 'desktop', page]
      : [...marketQueryKeys.forumPosts('fmkorea_stock'), 'desktop', page],
    queryFn: () =>
      urlSearchQuery
        ? searchForumPosts({ source: 'fmkorea_stock', query: urlSearchQuery, limit, page })
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
    queryKey: urlSearchQuery
      ? ['searchForumPosts', 'fmkorea_stock', urlSearchQuery, 'mobile']
      : [...marketQueryKeys.forumPosts('fmkorea_stock'), 'mobile'],
    queryFn: ({ pageParam }) =>
      urlSearchQuery
        ? searchForumPosts({ source: 'fmkorea_stock', query: urlSearchQuery, limit, cursor: pageParam })
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
          logger.debug('Realtime 업데이트 수신', payload)
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
      logger.error('새로고침 실패', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient])

  // 검색어 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
  }, [urlSearchQuery])

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
    handleSearch,
    handleInstantSearch,
  }
}
