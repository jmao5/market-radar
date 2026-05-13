'use client'

/**
 * app/posts/[id]/PostDetailClient.tsx
 *
 * 게시글 상세 UI (본문 + 댓글)
 * - body_text null → 상세 스크래핑 트리거 후 원본 링크 안내
 * - 댓글: depth 0 = 일반, depth 1+ = 들여쓰기 대댓글
 * - is_writer = true → 작성자 뱃지
 */

import { useQuery } from '@tanstack/react-query'
import {
  getForumPostDetail,
  getForumComments,
  marketQueryKeys,
} from '@/lib/supabase/marketQueries'
import type { ForumComment } from '@/types/market'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { BiArrowBack, BiShow, BiLike, BiComment, BiLinkExternal } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ── 스켈레톤 ─────────────────────────────────────────────────
function BodySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-5">
      {[80, 100, 60, 90, 70].map((w, i) => (
        <div key={i} className={`skeleton-shimmer h-3.5 rounded`} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function CommentSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="skeleton-shimmer h-2.5 w-20 rounded" />
      <div className="skeleton-shimmer h-3.5 w-4/5 rounded" />
    </div>
  )
}

// ── 댓글 단일 행 ─────────────────────────────────────────────
function CommentRow({ comment }: { comment: ForumComment }) {
  const indent = comment.depth * 16

  return (
    <div
      className="flex flex-col gap-1 py-3 pr-4"
      style={{
        paddingLeft: `${16 + indent}px`,
        borderBottom: '1px solid var(--border-subtle)',
        background: comment.depth > 0 ? 'var(--bg-sub)' : 'transparent',
      }}
    >
      {/* 대댓글 화살표 */}
      {comment.depth > 0 && (
        <span className="text-[10px] select-none" style={{ color: 'var(--text-muted)' }}>
          {'↳'.repeat(comment.depth)}
        </span>
      )}

      {/* 메타 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-semibold"
          style={{ color: comment.is_writer ? 'var(--point-color)' : 'var(--text-sub)' }}
        >
          {comment.author ?? '익명'}
          {comment.is_writer && (
            <span
              className="ml-1 text-[9px] px-1 py-0.5 rounded font-bold"
              style={{ background: 'var(--point-color)', color: '#fff' }}
            >
              글쓴이
            </span>
          )}
        </span>
        {comment.voted_count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <BiLike size={10} />
            {comment.voted_count}
          </span>
        )}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {dayjs(comment.scraped_at).fromNow()}
        </span>
      </div>

      {/* 내용 */}
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
        {comment.content}
      </p>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function PostDetailClient({
  id,
  originalUrl,
}: {
  id: string
  originalUrl: string
}) {
  const router = useRouter()

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: marketQueryKeys.forumPostDetail(id),
    queryFn: () => getForumPostDetail(id),
    staleTime: 1000 * 60 * 3,
  })

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: marketQueryKeys.forumComments(id),
    queryFn: () => getForumComments(id),
    staleTime: 1000 * 60 * 3,
  })

  // body_text가 없으면 상세 스크래핑 트리거 (fire-and-forget)
  useEffect(() => {
    if (post && post.body_text === null) {
      fetch(`/api/cron/scrape-detail?limit=1`).catch(() => {})
    }
  }, [post])

  const topComments = comments.filter((c) => c.depth === 0)
  // comment_srl 기준으로 대댓글 그룹핑
  const repliesOf = (srl: string) => comments.filter((c) => c.parent_srl === srl)

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-main)' }}>

      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity active:opacity-60"
          style={{ background: 'var(--bg-sub)' }}
          aria-label="뒤로가기"
        >
          <BiArrowBack size={16} style={{ color: 'var(--text-main)' }} />
        </button>
        <span className="text-[13px] font-semibold line-clamp-1 flex-1" style={{ color: 'var(--text-main)' }}>
          {post?.title ?? '게시글'}
        </span>
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity active:opacity-60"
          style={{ background: 'var(--bg-sub)' }}
          aria-label="원본 보기"
        >
          <BiLinkExternal size={15} style={{ color: 'var(--text-muted)' }} />
        </a>
      </div>

      {/* 게시글 헤더 정보 */}
      {post && (
        <div
          className="px-4 pt-4 pb-3 flex flex-col gap-2"
          style={{ borderBottom: '1px solid var(--border-main)' }}
        >
          {post.category && (
            <span
              className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-sub)', color: 'var(--point-color)', border: '1px solid var(--border-main)' }}
            >
              {post.category}
            </span>
          )}
          <h1 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-sub)' }}>
              {post.author ?? '익명'}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {dayjs(post.scraped_at).fromNow()}
            </span>
            {post.view_count != null && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <BiShow size={12} />
                {post.view_count.toLocaleString()}
              </span>
            )}
            {post.comment_count != null && post.comment_count > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <BiComment size={12} />
                {post.comment_count}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div className="flex-1">
        {postLoading ? (
          <BodySkeleton />
        ) : post?.body_text ? (
          <div
            className="px-4 py-5 text-[14px] leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-main)' }}
          >
            {post.body_text}
          </div>
        ) : (
          // 아직 상세 스크래핑이 안 된 경우
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              본문을 불러오는 중입니다.
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              잠시 후 새로고침하거나 원본을 확인하세요.
            </p>
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-opacity active:opacity-60"
              style={{ background: 'var(--point-color)', color: '#fff' }}
            >
              <BiLinkExternal size={13} />
              원본 에펨코리아에서 보기
            </a>
          </div>
        )}
      </div>

      {/* 댓글 섹션 */}
      <div style={{ borderTop: '6px solid var(--bg-sub)' }}>
        <div
          className="flex items-center justify-between px-4 py-2.5 sticky z-10"
          style={{ top: '49px', background: 'var(--bg-sub)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            댓글
          </p>
          {!commentsLoading && comments.length > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {comments.length}개
            </span>
          )}
        </div>

        {commentsLoading ? (
          [1, 2, 3, 4].map((i) => <CommentSkeleton key={i} />)
        ) : comments.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
            댓글이 없거나 아직 불러오지 못했어요.
          </p>
        ) : (
          // 최상위 댓글 → 그 아래 대댓글 순서로 렌더
          topComments.map((c) => (
            <div key={c.id}>
              <CommentRow comment={c} />
              {repliesOf(c.comment_srl).map((r) => (
                <CommentRow key={r.id} comment={r} />
              ))}
            </div>
          ))
        )}
        <div className="h-8" />
      </div>
    </div>
  )
}
