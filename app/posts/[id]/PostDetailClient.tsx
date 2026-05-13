'use client'

import '@/app/post-body.css'
import { useQuery } from '@tanstack/react-query'
import { getForumPostDetail, getForumComments, marketQueryKeys } from '@/lib/supabase/marketQueries'
import type { ForumComment } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import { useRouter } from 'next/navigation'
import { BiArrowBack, BiTime, BiShow, BiLike } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

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
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--point-color)', color: '#fff' }}>
            글쓴이
          </span>
        )}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {dayjs(comment.scraped_at).fromNow()}
        </span>
        {comment.voted_count > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-bold" style={{ color: 'var(--point-color)' }}>
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

  if (postLoading) return <Skeleton />

  // 에러 또는 데이터 없음 — 원인 표시
  if (postError || !post) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
        >
          <button onClick={() => router.back()} className="p-1 rounded active:opacity-60" style={{ color: 'var(--text-main)' }}>
            <BiArrowBack size={20} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>게시글 없음</span>
        </div>
        <div className="flex flex-1 items-center justify-center flex-col gap-3 px-6 text-center">
          <p className="text-3xl">📭</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>게시글을 찾을 수 없습니다</p>
          {/* 디버그용 — 개발 중에만 표시 */}
          <p className="text-[11px] font-mono px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)' }}>
            ID: {id}
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <button onClick={() => router.back()} className="p-1 rounded active:opacity-60" style={{ color: 'var(--text-main)' }}>
          <BiArrowBack size={20} />
        </button>
        <span className="text-[13px] font-semibold line-clamp-1 flex-1" style={{ color: 'var(--text-main)' }}>
          {post.title}
        </span>
        <a
          href={post.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
        >
          원문
        </a>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* 메타 */}
        <div className="px-4 py-4 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border-main)' }}>
          <h1 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>
              {post.author ?? '익명'}
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <BiTime size={11} />{dayjs(post.scraped_at).fromNow()}
            </span>
            {post.view_count != null && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <BiShow size={11} />{post.view_count.toLocaleString()}
              </span>
            )}
            {post.vote_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--point-color)' }}>
                <BiLike size={11} />{post.vote_count}
              </span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-main)' }}>
          {post.body_html ? (
            <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>본문 스크래핑 대기 중...</p>
              <a href={post.url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-4 py-2 rounded-full" style={{ background: 'var(--point-color)', color: '#fff' }}>
                원문 보기
              </a>
            </div>
          )}
        </div>

        {/* 댓글 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'var(--bg-sub)', borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              댓글
            </p>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {commentsLoading ? '...' : `${comments.length}개`}
            </span>
          </div>

          {commentsLoading
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
            )
          }
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
