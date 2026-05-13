'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getForumPosts, searchForumPosts, getLatestMarketIndices, marketQueryKeys } from '@/lib/supabase/marketQueries'
import type { MarketIndex, ForumPost } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BiRefresh, BiTime, BiShow, BiSearch } from 'react-icons/bi'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDebounce } from '@/hooks/useDebounce'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ── 공통: 데이터 훅 ───────────────────────────────────────────
function useMarketData() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const { data: indices, isLoading: indicesLoading } = useQuery({
    queryKey: marketQueryKeys.marketIndices(),
    queryFn: getLatestMarketIndices,
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60 * 5,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: debouncedQuery 
      ? ['searchForumPosts', 'fmkorea_stock', debouncedQuery]
      : marketQueryKeys.forumPosts('fmkorea_stock'),
    queryFn: () => 
      debouncedQuery
        ? searchForumPosts({ source: 'fmkorea_stock', query: debouncedQuery, limit: 30 })
        : getForumPosts({ source: 'fmkorea_stock', limit: 30 }),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  })

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

  return {
    indices,
    indicesLoading,
    posts: postsData?.items ?? (Array.isArray(postsData) ? postsData : []),
    postsLoading,
    isRefreshing,
    lastUpdated,
    handleRefresh,
    searchQuery,
    setSearchQuery,
  }
}

// ── 공통: 시장 지수 카드 ──────────────────────────────────────
function MarketIndexCard({ index }: { index: MarketIndex }) {
  const direction = index.change_pct > 0 ? 'up' : index.change_pct < 0 ? 'down' : 'flat'
  const color = direction === 'up' ? '#ef4444' : direction === 'down' ? '#3b82f6' : 'var(--text-muted)'

  return (
    <div className="app-card flex flex-col gap-0.5 px-3 py-2.5 min-w-[96px]">
      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
        {index.symbol}
      </span>
      <span className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>
        {index.price.toLocaleString()}
      </span>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'}{' '}
        {Math.abs(index.change_pct).toFixed(2)}%
      </span>
    </div>
  )
}

function MarketIndexSkeleton() {
  return (
    <div className="app-card flex flex-col gap-1.5 px-3 py-2.5 min-w-[96px]">
      <div className="skeleton-shimmer h-2.5 w-10 rounded" />
      <div className="skeleton-shimmer h-4 w-14 rounded" />
      <div className="skeleton-shimmer h-2.5 w-8 rounded" />
    </div>
  )
}

// ── 공통: 게시글 스켈레톤 ────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="skeleton-shimmer h-3.5 w-4/5 rounded" />
      <div className="skeleton-shimmer h-2.5 w-1/3 rounded" />
    </div>
  )
}

// ── 모바일: 게시글 행 ─────────────────────────────────────────
function MobilePostRow({ post }: { post: Omit<ForumPost, 'body_text'> }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/posts/${post.id}`)}
      className="flex items-start gap-3 px-4 py-3 w-full text-left active:opacity-60 transition-opacity"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-[13px] font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-main)' }}>
          {post.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {post.author && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{post.author}</span>}
          {post.view_count != null && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              조회 {post.view_count.toLocaleString()}
            </span>
          )}
          {post.comment_count != null && post.comment_count > 0 && (
            <span className="text-[10px] font-bold" style={{ color: 'var(--point-color)' }}>
              [{post.comment_count}]
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {dayjs(post.scraped_at).fromNow()}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── 데스크탑: 게시글 테이블 행 ───────────────────────────────
function DesktopPostRow({ post, index }: { post: Omit<ForumPost, 'body_text'>; index: number }) {
  const router = useRouter()
  return (
    <tr
      className="group transition-colors cursor-pointer"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      onClick={() => router.push(`/posts/${post.id}`)}
    >
      <td className="py-3 pl-6 pr-3 text-[12px] w-8" style={{ color: 'var(--text-muted)' }}>
        {index + 1}
      </td>
      <td className="py-3 pr-4">
        <span
          className="text-[13px] font-medium leading-snug line-clamp-1 group-hover:underline"
          style={{ color: 'var(--text-main)' }}
        >
          {post.title}
          {post.comment_count != null && post.comment_count > 0 && (
            <span className="ml-1.5 text-[12px] font-bold" style={{ color: 'var(--point-color)' }}>
              [{post.comment_count}]
            </span>
          )}
        </span>
      </td>
      <td className="py-3 pr-4 text-[12px] w-28 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {post.author ?? '—'}
      </td>
      <td className="py-3 pr-4 text-[12px] w-20 text-right whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {post.view_count != null ? post.view_count.toLocaleString() : '—'}
      </td>
      <td className="py-3 pr-6 text-[12px] w-24 text-right whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {dayjs(post.scraped_at).fromNow()}
      </td>
    </tr>
  )
}

// ── 모바일 뷰 ─────────────────────────────────────────────────
function MobileView() {
  const { indices, indicesLoading, posts, postsLoading, isRefreshing, lastUpdated, handleRefresh, searchQuery, setSearchQuery } = useMarketData()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <h1 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>📡 Market Radar</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {dayjs(lastUpdated).format('HH:mm')} 기준
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
            style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
          >
            <BiRefresh size={14} className={isRefreshing ? 'animate-loading-spin' : ''} />
            {isRefreshing ? '갱신 중' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 시장 지수 */}
      <section className="px-4 py-3">
        <p className="text-[10px] font-bold mb-2 tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          시장 지수
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {indicesLoading
            ? [1, 2, 3, 4].map((i) => <MarketIndexSkeleton key={i} />)
            : indices && indices.length > 0
              ? indices.map((idx) => <MarketIndexCard key={idx.id} index={idx} />)
              : <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>지수 데이터 없음</p>
          }
        </div>
      </section>

      <div className="section-divider" />

      {/* 게시글 */}
      <section className="flex flex-col">
        <div
          className="flex items-center justify-between px-4 py-2.5 sticky z-10"
          style={{ top: '49px', background: 'var(--bg-sub)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            주갤 정보
          </p>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {!postsLoading && posts.length > 0 ? `${posts.length}건` : ''}
          </span>
        </div>

        {/* 검색창 */}
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative flex items-center">
            <BiSearch className="absolute left-3" style={{ color: 'var(--text-muted)' }} size={16} />
            <input
              type="text"
              placeholder="제목, 본문 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none pl-9 pr-3 py-2 rounded-xl"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-main)',
              }}
            />
          </div>
        </div>

        {postsLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => <PostSkeleton key={i} />)
          : posts.map((post) => <MobilePostRow key={post.id} post={post} />)
        }
      </section>
      <div className="h-4" />
    </div>
  )
}

// ── 데스크탑 뷰 ───────────────────────────────────────────────
function DesktopView() {
  const { indices, indicesLoading, posts, postsLoading, isRefreshing, lastUpdated, handleRefresh, searchQuery, setSearchQuery } = useMarketData()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* 상단 헤더 바 */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--text-main)' }}>대시보드</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            에펨코리아 주식 갤러리 실시간 현황
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <BiTime size={14} />
            {dayjs(lastUpdated).format('MM/DD HH:mm')} 기준
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--point-color)', color: '#fff' }}
          >
            <BiRefresh size={14} className={isRefreshing ? 'animate-loading-spin' : ''} />
            {isRefreshing ? '갱신 중...' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

        {/* 지수 카드 그리드 */}
        <section>
          <p className="text-[11px] font-bold mb-3 tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            시장 지수
          </p>
          <div className="flex gap-3 flex-wrap">
            {indicesLoading
              ? [1, 2, 3, 4].map((i) => <MarketIndexSkeleton key={i} />)
              : indices && indices.length > 0
                ? indices.map((idx) => <MarketIndexCard key={idx.id} index={idx} />)
                : (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                  >
                    지수 데이터 없음 — C단계 추가 후 표시됩니다
                  </div>
                )
            }
          </div>
        </section>

        {/* 게시글 테이블 */}
        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                주갤 정보
              </p>
              {!postsLoading && posts.length > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
                >
                  {posts.length}건
                </span>
              )}
            </div>
            
            {/* 검색창 */}
            <div className="relative flex items-center w-64">
              <BiSearch className="absolute left-3" style={{ color: 'var(--text-muted)' }} size={16} />
              <input
                type="text"
                placeholder="제목, 본문 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[12px] outline-none pl-9 pr-3 py-1.5 rounded-lg transition-colors focus:border-[var(--point-color)]"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-main)',
                }}
              />
            </div>
          </div>

          <div
            className="flex-1 overflow-hidden rounded-xl"
            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)' }}
          >
            <div className="overflow-y-auto h-full scrollbar-hide">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-sub)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-main)' }}>
                    <th className="py-2.5 pl-6 pr-3 text-left text-[11px] font-semibold w-8" style={{ color: 'var(--text-muted)' }}>#</th>
                    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>제목</th>
                    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold w-28" style={{ color: 'var(--text-muted)' }}>작성자</th>
                    <th className="py-2.5 pr-4 text-right text-[11px] font-semibold w-20" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center justify-end gap-1"><BiShow size={12} />조회</span>
                    </th>
                    <th className="py-2.5 pr-6 text-right text-[11px] font-semibold w-24" style={{ color: 'var(--text-muted)' }}>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {postsLoading
                    ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td colSpan={5} className="px-6 py-3">
                          <div className="skeleton-shimmer h-3.5 w-full rounded" />
                        </td>
                      </tr>
                    ))
                    : posts.map((post, i) => (
                      <DesktopPostRow key={post.id} post={post} index={i} />
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

// ── 메인 진입점 ───────────────────────────────────────────────
export default function HomeClient() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileView /> : <DesktopView />
}
