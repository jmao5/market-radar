'use client'

import '@/app/post-body.css'
import { useQuery } from '@tanstack/react-query'
import { getForumPostDetail, getForumComments, marketQueryKeys } from '@/lib/supabase/marketQueries'
import type { ForumComment } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { BiArrowBack, BiTime, BiShow, BiLike, BiRefresh } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ── 본문 자동 스크래핑 훅 ────────────────────────────────────
//
// 동작 원리:
//   1. 페이지 진입 즉시(0ms) scrape-detail API 호출 시작
//   2. TanStack Query refetchInterval=2000으로 DB polling
//   3. body_html 채워지면 polling 자동 중단
//   4. API 실패 or 3회 이후 수동 재시도 버튼 노출
//
function useOnDemandScrape(postId: string, hasBody: boolean) {
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const attemptRef = useRef(0)
  const MAX_AUTO = 3

  async function triggerScrape() {
    if (isScraping || hasBody) return
    setIsScraping(true)
    setScrapeError(false)
    setIsRateLimited(false)
    try {
      const res = await fetch(`/api/cron/scrape-detail?id=${postId}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (json.isRateLimited) {
        setIsRateLimited(true)
        setScrapeError(true)
      } else if (!json.ok) {
        setScrapeError(true)
      }
    } catch {
      setScrapeError(true)
    } finally {
      setIsScraping(false)
      attemptRef.current += 1
    }
  }

  // 진입 즉시 스크래핑 시작 (0ms)
  useEffect(() => {
    if (hasBody) return
    triggerScrape()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canRetry = !isScraping && !hasBody && scrapeError
  const attempts = attemptRef.current

  return { isScraping, scrapeError, isRateLimited, canRetry, attempts, MAX_AUTO, triggerScrape }
}

// ── 댓글 아이템 ──────────────────────────────────────────────
function CommentItem({ comment }: { comment: ForumComment }) {
  const isReply = comment.depth > 0
  return (
    <div
      className="flex flex-col gap-1 py-3"
      style={{
        marginLeft: `${comment.depth * 20}px`,
        paddingLeft: isReply ? '12px' : '16px',
        paddingRight: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: isReply ? '2px solid var(--border-main)' : undefined,
        background: isReply ? 'var(--bg-sub)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {isReply && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>↳</span>}
        <span
          className="text-[12px] font-semibold"
          style={{ color: comment.is_writer ? 'var(--point-color)' : 'var(--text-main)' }}
        >
          {comment.author ?? '익명'}
        </span>
        {comment.is_writer && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'var(--point-color)', color: '#fff' }}>
            글쓴이
          </span>
        )}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {dayjs(comment.scraped_at).fromNow()}
        </span>
        {comment.voted_count > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-bold"
            style={{ color: 'var(--point-color)' }}>
            <BiLike size={11} />
            {comment.voted_count}
          </span>
        )}
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
        {comment.content}
      </p>
    </div>
  )
}

// ── 스켈레톤 ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 gap-3">
      <div className="skeleton-shimmer h-5 w-3/4 rounded" />
      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
      <div className="mt-6 flex flex-col gap-3">
        {[80, 100, 90, 70, 95].map((w, i) => (
          <div key={i} className="skeleton-shimmer h-3 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

// ── 본문 대기 UI ─────────────────────────────────────────────
function BodyPending({
  postUrl,
  isScraping,
  scrapeError,
  isRateLimited,
  canRetry,
  onRetry,
}: {
  postUrl: string
  isScraping: boolean
  scrapeError: boolean
  isRateLimited: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
      {isScraping ? (
        <>
          <BiRefresh size={26} className="animate-spin" style={{ color: 'var(--point-color)' }} />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            본문 불러오는 중...
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            잠시만 기다려 주세요
          </p>
        </>
      ) : isRateLimited ? (
        <>
          <p className="text-2xl">⏳</p>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            에펨코리아 요청 제한(430) 상태입니다
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            보안 시스템에 의해 일시적으로 접근이 차단되었습니다.<br />약 1~5분 후 다시 시도해 주세요.
          </p>
          <div className="flex gap-2 mt-2">
            {canRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
                style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
              >
                <BiRefresh size={13} /> 다시 시도
              </button>
            )}
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold px-4 py-2 rounded-full"
              style={{ background: 'var(--point-color)', color: '#fff' }}
            >
              원문 보기
            </a>
          </div>
        </>
      ) : scrapeError ? (
        <>
          <p className="text-2xl">😞</p>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            본문을 가져오지 못했어요
          </p>
          <div className="flex gap-2 mt-1">
            {canRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
                style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
              >
                <BiRefresh size={13} /> 다시 시도
              </button>
            )}
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold px-4 py-2 rounded-full"
              style={{ background: 'var(--point-color)', color: '#fff' }}
            >
              원문 보기
            </a>
          </div>
        </>
      ) : (
        <>
          <BiRefresh size={22} style={{ color: 'var(--text-muted)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            본문 준비 중...
          </p>
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-3 py-1.5 rounded-full mt-1"
            style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            원문 보기
          </a>
        </>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function PostDetailClient({ id }: { id: string }) {
  const router = useRouter()

  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: marketQueryKeys.forumPostDetail(id),
    queryFn: () => getForumPostDetail(id),
    staleTime: 1000 * 30,
    // body_html 없으면 2초마다 polling — 스크래핑 완료 즉시 감지
    refetchInterval: (query) => {
      const data = query.state.data
      const hasBody = !!(data?.body_html && data.body_html.trim().length > 0)
      return hasBody ? false : 2000
    },
    refetchIntervalInBackground: false,
  })

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: marketQueryKeys.forumComments(id),
    queryFn: () => getForumComments(id),
    enabled: !!post?.body_html,   // 본문 완료 후 댓글 fetch
    staleTime: 1000 * 60 * 5,
  })

  const hasBody = !!(post?.body_html && post.body_html.trim().length > 0)
  const { isScraping, scrapeError, isRateLimited, canRetry, triggerScrape } = useOnDemandScrape(id, hasBody)

  if (postLoading) return <Skeleton />

  if (postError || !post) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}>
          <button onClick={() => router.back()} className="p-1 rounded active:opacity-60"
            style={{ color: 'var(--text-main)' }}>
            <BiArrowBack size={20} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>
            게시글 없음
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center flex-col gap-3 px-6 text-center">
          <p className="text-3xl">📭</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>게시글을 찾을 수 없습니다</p>
          <button onClick={() => router.back()}
            className="mt-2 text-xs px-4 py-2 rounded-full"
            style={{ background: 'var(--point-color)', color: '#fff' }}>
            뒤로가기
          </button>
        </div>
      </div>
    )
  }

  const displayTime = dayjs(post.posted_at ?? post.scraped_at).fromNow()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}>
        <button onClick={() => router.back()} className="p-1 rounded active:opacity-60"
          style={{ color: 'var(--text-main)' }}>
          <BiArrowBack size={20} />
        </button>
        <span className="text-[13px] font-semibold line-clamp-1 flex-1"
          style={{ color: 'var(--text-main)' }}>
          {post.title}
        </span>
        <a href={post.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}>
          원문
        </a>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* 메타 */}
        <div className="px-4 py-4 flex flex-col gap-2"
          style={{ borderBottom: '1px solid var(--border-main)' }}>
          <h1 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>
              {post.author ?? '익명'}
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <BiTime size={11} /> {displayTime}
            </span>
            {post.view_count != null && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <BiShow size={11} /> {post.view_count.toLocaleString()}
              </span>
            )}
            {post.vote_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--point-color)' }}>
                <BiLike size={11} /> {post.vote_count}
              </span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-main)', minHeight: '120px' }}>
          {hasBody ? (
            <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body_html! }} />
          ) : (
            <BodyPending
              postUrl={post.url}
              isScraping={isScraping}
              scrapeError={scrapeError}
              isRateLimited={isRateLimited}
              canRetry={canRetry}
              onRetry={triggerScrape}
            />
          )}
        </div>

        {/* 댓글 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'var(--bg-sub)', borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: 'var(--text-muted)' }}>댓글</p>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {commentsLoading ? '...' : `${comments.length}개`}
            </span>
          </div>

          {!hasBody ? null
            : commentsLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="skeleton-shimmer h-2.5 w-1/4 rounded mb-2" />
                  <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                </div>
              ))
            : comments.length > 0
            ? comments.map((c) => <CommentItem key={c.id} comment={c} />)
            : (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>댓글 없음</p>
              </div>
            )}
        </div>
        <div className="h-6" />
      </div>
    </div>
  )
}
