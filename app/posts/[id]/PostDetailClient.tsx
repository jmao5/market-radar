'use client'

import '@/app/post-body.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getForumPostDetail, getForumComments, marketQueryKeys } from '@/lib/supabase/marketQueries'
import type { ForumComment } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { BiArrowBack, BiTime, BiShow, BiLike, BiRefresh } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// 본문이 비어있을 때 자동/수동으로 다시 스크래핑 요청
function useBodyRefetch(postId: string, hasBody: boolean) {
  const queryClient = useQueryClient()
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_AUTO_RETRY = 3
  const AUTO_RETRY_INTERVAL = 8_000 // 8초

  const doRetry = useCallback(async () => {
    if (isRetrying) return
    setIsRetrying(true)
    try {
      await fetch(`/api/cron/scrape-detail?id=${postId}`, { cache: 'no-store' })
      // 쿼리 무효화해서 최신 데이터 다시 fetch
      await queryClient.invalidateQueries({
        queryKey: marketQueryKeys.forumPostDetail(postId),
      })
      await queryClient.refetchQueries({
        queryKey: marketQueryKeys.forumPostDetail(postId),
      })
    } catch {
      // silent
    } finally {
      setIsRetrying(false)
      setRetryCount((c) => c + 1)
    }
  }, [isRetrying, postId, queryClient])

  // 본문 없을 때 자동 재시도 (최대 MAX_AUTO_RETRY회)
  useEffect(() => {
    if (hasBody) return
    if (retryCount >= MAX_AUTO_RETRY) return

    const timer = setTimeout(() => {
      doRetry()
    }, AUTO_RETRY_INTERVAL)

    return () => clearTimeout(timer)
  }, [hasBody, retryCount, doRetry])

  return { isRetrying, retryCount, maxAutoRetry: MAX_AUTO_RETRY, doRetry }
}

function CommentItem({ comment }: { comment: ForumComment }) {
  const indentPx = comment.depth * 20
  const isReply = comment.depth > 0

  return (
    <div
      className="flex flex-col gap-1 py-3"
      style={{
        marginLeft: `${indentPx}px`,
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
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'var(--point-color)', color: '#fff' }}
          >
            글쓴이
          </span>
        )}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {dayjs(comment.scraped_at).fromNow()}
        </span>
        {comment.voted_count > 0 && (
          <span
            className="ml-auto flex items-center gap-0.5 text-[11px] font-bold"
            style={{ color: 'var(--point-color)' }}
          >
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

function Skeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 gap-3">
      <div className="skeleton-shimmer h-5 w-3/4 rounded" />
      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
      <div className="mt-6 flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-shimmer h-3 w-full rounded" />
        ))}
      </div>
    </div>
  )
}

// 본문 없을 때 표시할 대기 UI
function BodyPending({
  postUrl,
  isRetrying,
  retryCount,
  maxAutoRetry,
  onManualRetry,
}: {
  postUrl: string
  isRetrying: boolean
  retryCount: number
  maxAutoRetry: number
  onManualRetry: () => void
}) {
  const autoRetryDone = retryCount >= maxAutoRetry

  return (
    <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
      {isRetrying ? (
        <>
          <BiRefresh
            size={28}
            className="animate-spin"
            style={{ color: 'var(--point-color)' }}
          />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            본문 불러오는 중...
          </p>
        </>
      ) : autoRetryDone ? (
        <>
          <p className="text-2xl">😞</p>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            본문을 가져오지 못했어요
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            에펨코리아에서 직접 확인하거나<br />수동으로 다시 시도해보세요
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={onManualRetry}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
              style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
            >
              <BiRefresh size={14} />
              다시 시도
            </button>
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
              style={{ background: 'var(--point-color)', color: '#fff' }}
            >
              원문 보기
            </a>
          </div>
        </>
      ) : (
        <>
          <BiRefresh
            size={24}
            style={{ color: 'var(--text-muted)' }}
          />
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            본문 스크래핑 대기 중...
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            잠시 후 자동으로 다시 시도합니다 ({retryCount}/{maxAutoRetry})
          </p>
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold px-4 py-2 rounded-full mt-1"
            style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
          >
            원문 보기
          </a>
        </>
      )}
    </div>
  )
}

export default function PostDetailClient({ id }: { id: string }) {
  const router = useRouter()

  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: marketQueryKeys.forumPostDetail(id),
    queryFn: () => getForumPostDetail(id),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: marketQueryKeys.forumComments(id),
    queryFn: () => getForumComments(id),
    enabled: !!post,
    staleTime: 1000 * 60 * 5,
  })

  const hasBody = !!(post?.body_html && post.body_html.trim().length > 0)
  const { isRetrying, retryCount, maxAutoRetry, doRetry } = useBodyRefetch(id, hasBody)

  if (postLoading) return <Skeleton />

  if (postError || !post) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
        >
          <button
            onClick={() => router.back()}
            className="p-1 rounded active:opacity-60"
            style={{ color: 'var(--text-main)' }}
          >
            <BiArrowBack size={20} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>
            게시글 없음
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center flex-col gap-3 px-6 text-center">
          <p className="text-3xl">📭</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            게시글을 찾을 수 없습니다
          </p>
          {postError && (
            <p className="text-[11px] text-red-400 max-w-xs">{String(postError)}</p>
          )}
          <button
            onClick={() => router.back()}
            className="mt-2 text-xs px-4 py-2 rounded-full"
            style={{ background: 'var(--point-color)', color: '#fff' }}
          >
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
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <button
          onClick={() => router.back()}
          className="p-1 rounded active:opacity-60"
          style={{ color: 'var(--text-main)' }}
        >
          <BiArrowBack size={20} />
        </button>
        <span
          className="text-[13px] font-semibold line-clamp-1 flex-1"
          style={{ color: 'var(--text-main)' }}
        >
          {post.title}
        </span>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0"
          style={{
            background: 'var(--bg-sub)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-main)',
          }}
        >
          원문
        </a>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* 메타 */}
        <div
          className="px-4 py-4 flex flex-col gap-2"
          style={{ borderBottom: '1px solid var(--border-main)' }}
        >
          <h1 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>
              {post.author ?? '익명'}
            </span>
            <span
              className="flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <BiTime size={11} />
              {displayTime}
            </span>
            {post.view_count != null && (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <BiShow size={11} />
                {post.view_count.toLocaleString()}
              </span>
            )}
            {post.vote_count > 0 && (
              <span
                className="flex items-center gap-1 text-[11px] font-bold"
                style={{ color: 'var(--point-color)' }}
              >
                <BiLike size={11} />
                {post.vote_count}
              </span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div
          className="px-4 py-5"
          style={{ borderBottom: '1px solid var(--border-main)', minHeight: '120px' }}
        >
          {hasBody ? (
            <div
              className="post-body"
              dangerouslySetInnerHTML={{ __html: post.body_html! }}
            />
          ) : (
            <BodyPending
              postUrl={post.url}
              isRetrying={isRetrying}
              retryCount={retryCount}
              maxAutoRetry={maxAutoRetry}
              onManualRetry={doRetry}
            />
          )}
        </div>

        {/* 댓글 */}
        <div className="flex flex-col">
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              background: 'var(--bg-sub)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              댓글
            </p>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {commentsLoading ? '...' : `${comments.length}개`}
            </span>
          </div>

          {commentsLoading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
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
