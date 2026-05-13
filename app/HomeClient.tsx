'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getForumPosts, getLatestMarketIndices, marketQueryKeys } from '@/lib/supabase/marketQueries'
import type { MarketIndex, ForumPost } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { useState, useCallback } from 'react'
import { BiRefresh } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ── 카테고리별 색상 ───────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  국내주식: '#ef4444',
  해외주식: '#22c55e',
  잡담: '#92400e',
  질문: '#b45309',
  정보공유: '#7c3aed',
  '종목추천,분석': '#ea580c',
  매매기법: '#dc2626',
  매매인증: '#0891b2',
  실적발표: '#1d4ed8',
  이벤트: '#db2777',
  공지: '#374151',
}

function getCategoryColor(category: string | null) {
  if (!category) return 'var(--text-muted)'
  return CATEGORY_COLORS[category] ?? 'var(--text-muted)'
}

// ── 시장 지수 카드 ────────────────────────────────────────────
function MarketIndexCard({ index }: { index: MarketIndex }) {
  const direction = index.change_pct > 0 ? 'up' : index.change_pct < 0 ? 'down' : 'flat'
  const color =
    direction === 'up' ? '#ef4444' : direction === 'down' ? '#3b82f6' : 'var(--text-muted)'

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

// ── 게시글 행 ─────────────────────────────────────────────────
function PostRow({ post }: { post: Omit<ForumPost, 'body_text'> }) {
  const categoryColor = getCategoryColor(post.source) // source 대신 카테고리 필드가 없으므로 임시

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 active:opacity-60 transition-opacity"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p
          className="text-[13px] font-medium leading-snug line-clamp-2"
          style={{ color: 'var(--text-main)' }}
        >
          {post.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {post.author && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {post.author}
            </span>
          )}
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
    </a>
  )
}

function PostSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="skeleton-shimmer h-3.5 w-4/5 rounded" />
      <div className="skeleton-shimmer h-2.5 w-1/3 rounded" />
    </div>
  )
}

// ── 새로고침 버튼 ─────────────────────────────────────────────
function RefreshButton({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
      style={{
        background: 'var(--bg-sub)',
        color: 'var(--text-sub)',
        border: '1px solid var(--border-main)',
      }}
      aria-label="새로고침"
    >
      <BiRefresh
        size={14}
        className={isRefreshing ? 'animate-loading-spin' : ''}
      />
      {isRefreshing ? '갱신 중' : '새로고침'}
    </button>
  )
}

// ── 홈 클라이언트 메인 ────────────────────────────────────────
export default function HomeClient() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // 시장 지수
  const { data: indices, isLoading: indicesLoading } = useQuery({
    queryKey: marketQueryKeys.marketIndices(),
    queryFn: getLatestMarketIndices,
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  })

  // 포럼 게시글
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: marketQueryKeys.forumPosts('fmkorea_stock'),
    queryFn: () => getForumPosts({ source: 'fmkorea_stock', limit: 30 }),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  })

  const posts = postsData?.items ?? []

  // 수동 새로고침: 스크래핑 API 호출 → 쿼리 무효화
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">

      {/* ── 헤더 ── */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <h1 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
          📡 Market Radar
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {dayjs(lastUpdated).format('HH:mm')} 기준
          </span>
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
        </div>
      </div>

      {/* ── 시장 지수 ── */}
      <section className="px-4 py-3">
        <p
          className="text-[10px] font-bold mb-2 tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          시장 지수
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {indicesLoading ? (
            [1, 2, 3, 4].map((i) => <MarketIndexSkeleton key={i} />)
          ) : indices && indices.length > 0 ? (
            indices.map((idx) => <MarketIndexCard key={idx.id} index={idx} />)
          ) : (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              지수 데이터 없음 — C단계 추가 후 표시됩니다
            </p>
          )}
        </div>
      </section>

      {/* ── 구분선 ── */}
      <div className="section-divider" />

      {/* ── 포럼 게시글 ── */}
      <section className="flex flex-col">
        <div
          className="flex items-center justify-between px-4 py-2.5 sticky z-10"
          style={{
            top: '49px', // 헤더 높이만큼 offset
            background: 'var(--bg-sub)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <p
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            주갤
          </p>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {!postsLoading && posts.length > 0 ? `${posts.length}건` : ''}
          </span>
        </div>

        {postsLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <PostSkeleton key={i} />)
        ) : posts.length > 0 ? (
          posts.map((post) => <PostRow key={post.id} post={post} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">📭</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              게시글이 없습니다
            </p>
            <button
              onClick={handleRefresh}
              className="text-xs px-4 py-2 rounded-full"
              style={{
                background: 'var(--point-color)',
                color: '#fff',
              }}
            >
              지금 불러오기
            </button>
          </div>
        )}
      </section>

      {/* ── 하단 여백 (Navbar 높이만큼) ── */}
      <div className="h-4" />
    </div>
  )
}
