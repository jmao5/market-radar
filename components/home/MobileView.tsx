import dayjs from 'dayjs'
import { BiRefresh, BiSearch } from 'react-icons/bi'
import { useMarketData } from '@/hooks/useMarketData'
import { MarketIndexCard, MarketIndexSkeleton } from './MarketIndexCard'
import { MobilePostRow, PostSkeleton } from './PostRow'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

export function MobileView() {
  const {
    indices,
    indicesLoading,
    posts,
    postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefreshing,
    lastUpdated,
    handleRefresh,
    searchQuery,
    setSearchQuery,
  } = useMarketData({ viewType: 'mobile' })

  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide bg-[var(--bg-main)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3.5 sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-main)]/80 border-b border-[var(--border-main)]">
        <h1 className="text-[17px] font-bold text-[var(--text-main)] tracking-tight">📡 Market Radar</h1>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            {dayjs(lastUpdated).format('HH:mm')}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-[0.92] disabled:opacity-40 bg-[var(--bg-sub)] text-[var(--text-sub)] border border-[var(--border-main)] shadow-sm"
          >
            <BiRefresh size={14} className={isRefreshing ? 'animate-loading-spin text-[var(--point-color)]' : ''} />
            {isRefreshing ? '갱신 중' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 시장 지수 */}
      <section className="px-5 py-4">
        <p className="text-[11px] font-bold mb-3 tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--point-color)]"></span>
          MARKET INDICES
        </p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x">
          {indicesLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="snap-start"><MarketIndexSkeleton /></div>)
          ) : indices && indices.length > 0 ? (
            indices.map((idx) => <div key={idx.id} className="snap-start"><MarketIndexCard index={idx} /></div>)
          ) : (
            <p className="text-[13px] py-2 text-[var(--text-muted)]">지수 데이터 없음</p>
          )}
        </div>
      </section>

      <div className="h-2 w-full bg-[var(--bg-sub)] border-y border-[var(--border-subtle)]" />

      {/* 게시글 */}
      <section className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 sticky z-10 backdrop-blur-md bg-[var(--bg-sub)]/90 border-b border-[var(--border-subtle)]" style={{ top: '56px' }}>
          <p className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--point-color)]"></span>
            FORUM FEED
          </p>
          <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
            {!postsLoading && posts.length > 0 ? `${posts.length}건` : '0건'}
          </span>
        </div>

        {/* 검색창 */}
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]">
          <div className="relative flex items-center group">
            <BiSearch className="absolute left-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--point-color)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="제목, 본문, 작성자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-sub)] text-[14px] text-[var(--text-main)] outline-none pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-main)] focus:border-[var(--point-color)] focus:ring-2 focus:ring-[var(--point-ring)] transition-all shadow-sm"
            />
          </div>
        </div>

        {postsLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => <PostSkeleton key={i} />)
          : posts.map((post) => <MobilePostRow key={post.id} post={post} />)}

        {/* 무한 스크롤 옵저버 */}
        {hasNextPage && (
          <div ref={ref} className="py-6 flex justify-center items-center">
            {isFetchingNextPage ? (
              <BiRefresh className="animate-loading-spin text-[var(--text-muted)]" size={24} />
            ) : (
              <span className="text-[12px] text-[var(--text-muted)]">스크롤하여 더 보기</span>
            )}
          </div>
        )}
        {!hasNextPage && posts.length > 0 && (
          <div className="py-6 flex justify-center items-center">
            <span className="text-[11px] text-[var(--text-muted)]">모든 게시글을 불러왔습니다.</span>
          </div>
        )}
      </section>
      <div className="h-4" />
    </div>
  )
}
