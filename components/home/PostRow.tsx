import type { ForumPost } from '@/types/market'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BiShow } from 'react-icons/bi'

dayjs.extend(relativeTime)
dayjs.locale('ko')

interface MobilePostRowProps {
  post: Omit<ForumPost, 'body_text'>
  onAuthorClick?: (author: string) => void
}

interface DesktopPostRowProps {
  post: Omit<ForumPost, 'body_text'>
  index: number
  onAuthorClick?: (author: string) => void
}

// ── 모바일: 게시글 행 ─────────────────────────────────────────
// 외부 래퍼를 <button> → <Link>로 교체: <button> 중첩 방지 (HTML 스펙 위반)
export function MobilePostRow({ post, onAuthorClick }: MobilePostRowProps) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex items-start gap-3 px-5 py-3.5 w-full text-left transition-all active:scale-[0.98] active:bg-[var(--bg-sub)] border-b border-[var(--border-subtle)]"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <p className="text-[14px] font-medium leading-relaxed line-clamp-2 text-[var(--text-main)]">
          {post.title}
        </p>
        <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
          {post.author && (
            <button
              type="button"
              onClick={(e) => {
                if (onAuthorClick) {
                  e.preventDefault()
                  e.stopPropagation()
                  onAuthorClick(post.author!)
                }
              }}
              className={`font-medium ${onAuthorClick ? 'text-[var(--text-main)] hover:text-[var(--point-color)] transition-colors' : 'text-[var(--text-sub)]'}`}
            >
              {post.author}
            </button>
          )}
          {post.view_count != null && (
            <span className="text-[var(--text-muted)]">
              조회 {post.view_count.toLocaleString()}
            </span>
          )}
          {post.comment_count != null && post.comment_count > 0 && (
            <span className="font-bold text-[var(--point-color)]">
              [{post.comment_count}]
            </span>
          )}
          <span className="text-[var(--text-muted)]">
            {dayjs(post.scraped_at).fromNow()}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── 데스크탑: 게시글 테이블 행 ───────────────────────────────
export function DesktopPostRow({ post, index, onAuthorClick }: DesktopPostRowProps) {
  const router = useRouter()
  return (
    <tr
      className="group transition-colors cursor-pointer border-b border-[var(--border-subtle)] hover:bg-[var(--bg-sub)]"
      onClick={() => router.push(`/posts/${post.id}`)}
    >
      <td className="py-3.5 pl-6 pr-3 text-[12px] font-medium w-8 text-[var(--text-muted)] group-hover:text-[var(--text-sub)] transition-colors">
        {index + 1}
      </td>
      <td className="py-3.5 pr-4">
        <span className="text-[14px] font-medium leading-relaxed line-clamp-1 group-hover:text-[var(--point-color)] transition-colors text-[var(--text-main)]">
          {post.title}
          {post.comment_count != null && post.comment_count > 0 && (
            <span className="ml-1.5 text-[12px] font-bold text-[var(--point-color)] opacity-90">
              [{post.comment_count}]
            </span>
          )}
        </span>
      </td>
      <td className="py-3.5 pr-4 text-[12px] w-28 whitespace-nowrap text-[var(--text-sub)]">
        {post.author ? (
          <button
            type="button"
            onClick={(e) => {
              if (onAuthorClick) {
                e.stopPropagation()
                onAuthorClick(post.author!)
              }
            }}
            className={onAuthorClick ? 'hover:text-[var(--point-color)] transition-colors font-medium text-[var(--text-main)]' : ''}
          >
            {post.author}
          </button>
        ) : (
          '—'
        )}
      </td>
      <td className="py-3.5 pr-4 text-[12px] w-20 text-right whitespace-nowrap text-[var(--text-muted)] group-hover:text-[var(--text-sub)] transition-colors">
        {post.view_count != null ? post.view_count.toLocaleString() : '—'}
      </td>
      <td className="py-3.5 pr-6 text-[12px] w-24 text-right whitespace-nowrap text-[var(--text-muted)]">
        {dayjs(post.scraped_at).fromNow()}
      </td>
    </tr>
  )
}

// ── 공통: 게시글 스켈레톤 ────────────────────────────────────
export function PostSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
      <div className="skeleton-shimmer h-3.5 w-4/5 rounded" />
      <div className="skeleton-shimmer h-2.5 w-1/3 rounded" />
    </div>
  )
}
