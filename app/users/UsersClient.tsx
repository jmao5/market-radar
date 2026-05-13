'use client'

/**
 * app/users/UsersClient.tsx
 *
 * 관심 작성자 관리 + 피드 통합 페이지
 *
 * 탭 구조:
 *   [피드]  — 감시 중인 모든 작성자의 최신 게시글 합산 (무한스크롤)
 *   [작성자] — 감시 목록 CRUD + 작성자별 게시글 드릴다운
 *
 * 기능:
 *   - 작성자 추가 (input + 엔터/버튼)
 *   - 작성자 삭제 (스와이프 or 삭제 버튼)
 *   - 작성자 클릭 → 해당 작성자 게시글 뷰 (슬라이드인)
 *   - 전체 피드 무한스크롤
 *   - 수동 스크래핑 트리거 버튼
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getWatchedAuthors,
  addWatchedAuthor,
  removeWatchedAuthor,
  getWatchedAuthorPosts,
  watchedAuthorQueryKeys,
} from '@/lib/supabase/watchedAuthorQueries'
import { MobilePostRow, PostSkeleton } from '@/components/home/PostRow'
import { useInView } from 'react-intersection-observer'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'
import {
  BiPlus,
  BiTrash,
  BiRefresh,
  BiArrowBack,
  BiUser,
  BiNews,
  BiTime,
  BiX,
} from 'react-icons/bi'
import type { WatchedAuthor } from '@/types/market'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ─────────────────────────────────────────────────────────────
// 하위 뷰: 특정 작성자 게시글
// ─────────────────────────────────────────────────────────────
function AuthorPostsView({
  author,
  onBack,
}: {
  author: string
  onBack: () => void
}) {
  const { ref, inView } = useInView()

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: watchedAuthorQueryKeys.posts([author]),
    queryFn: ({ pageParam }) =>
      getWatchedAuthorPosts({ authors: [author], limit: 30, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 1000 * 60 * 3,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--bg-main)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: 'var(--bg-sub)' }}
          aria-label="뒤로가기"
        >
          <BiArrowBack size={16} style={{ color: 'var(--text-main)' }} />
        </button>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>
            {author}
          </span>
          {!isLoading && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              게시글 {posts.length}건
            </span>
          )}
        </div>
      </div>

      {/* 게시글 목록 */}
      {isLoading ? (
        [1, 2, 3, 4, 5].map((i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
          <BiNews size={32} style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            저장된 게시글이 없어요
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            스크래핑이 실행되면 게시글이 채워집니다
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <MobilePostRow key={post.id} post={post} />
          ))}
          {hasNextPage && (
            <div ref={ref} className="py-6 flex justify-center">
              {isFetchingNextPage ? (
                <BiRefresh
                  className="animate-spin"
                  size={20}
                  style={{ color: 'var(--text-muted)' }}
                />
              ) : null}
            </div>
          )}
          {!hasNextPage && (
            <p className="py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              모든 게시글을 불러왔습니다
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 하위 뷰: 전체 피드
// ─────────────────────────────────────────────────────────────
function FeedView({ authors }: { authors: string[] }) {
  const { ref, inView } = useInView()

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: watchedAuthorQueryKeys.posts(authors),
    queryFn: ({ pageParam }) =>
      getWatchedAuthorPosts({ authors, limit: 30, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 1000 * 60 * 3,
    enabled: authors.length > 0,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <BiUser size={40} style={{ color: 'var(--text-muted)' }} />
        <p className="text-[15px] font-bold" style={{ color: 'var(--text-sub)' }}>
          관심 작성자를 추가해보세요
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          작성자 탭에서 닉네임을 등록하면<br />
          그 사람의 게시글을 여기서 모아볼 수 있어요
        </p>
      </div>
    )
  }

  if (isLoading) {
    return <>{[1, 2, 3, 4, 5, 6].map((i) => <PostSkeleton key={i} />)}</>
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
        <BiNews size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
          아직 수집된 게시글이 없어요
        </p>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          스크래핑이 실행되면 자동으로 채워집니다
        </p>
      </div>
    )
  }

  return (
    <>
      {posts.map((post) => (
        <MobilePostRow key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <div ref={ref} className="py-6 flex justify-center">
          {isFetchingNextPage && (
            <BiRefresh
              className="animate-spin"
              size={20}
              style={{ color: 'var(--text-muted)' }}
            />
          )}
        </div>
      )}
      {!hasNextPage && posts.length > 0 && (
        <p className="py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          모든 게시글을 불러왔습니다
        </p>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// 작성자 카드
// ─────────────────────────────────────────────────────────────
function AuthorCard({
  wa,
  onSelect,
  onDelete,
  isDeleting,
}: {
  wa: WatchedAuthor
  onSelect: (author: string) => void
  onDelete: (id: string, author: string) => void
  isDeleting: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-colors"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* 아바타 */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full font-bold text-[14px]"
        style={{ background: 'var(--point-color)20', color: 'var(--point-color)' }}
      >
        {wa.author.slice(0, 1).toUpperCase()}
      </div>

      {/* 텍스트 — 클릭 시 게시글 뷰로 */}
      <button
        className="flex-1 flex flex-col items-start gap-0.5 text-left"
        onClick={() => onSelect(wa.author)}
      >
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-main)' }}>
          {wa.author}
        </span>
        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <BiTime size={11} />
          {wa.last_scraped_at
            ? `마지막 수집 ${dayjs(wa.last_scraped_at).fromNow()}`
            : '아직 수집 전'}
        </span>
      </button>

      {/* 삭제 버튼 */}
      <button
        onClick={() => onDelete(wa.id, wa.author)}
        disabled={isDeleting}
        className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity disabled:opacity-40"
        style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)' }}
        aria-label={`${wa.author} 삭제`}
      >
        <BiTrash size={14} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────
type Tab = 'feed' | 'authors'

export default function UsersClient() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('feed')
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isScraping, setIsScraping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 작성자 목록 쿼리 ──────────────────────────────────────
  const { data: watchedAuthors = [], isLoading: authorsLoading } = useQuery({
    queryKey: watchedAuthorQueryKeys.all(),
    queryFn: getWatchedAuthors,
    staleTime: 1000 * 60 * 2,
  })

  const authorNames = watchedAuthors.map((w) => w.author)

  // ── 추가 mutation ─────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (author: string) => addWatchedAuthor(author),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.posts(authorNames) })
      toast.success(`"${data.author}" 추가됨`)
      setInputValue('')
    },
    onError: (err: Error) => {
      if (err.message.includes('duplicate') || err.message.includes('unique')) {
        toast.error('이미 등록된 작성자예요')
      } else {
        toast.error('추가 실패: ' + err.message)
      }
    },
  })

  // ── 삭제 mutation ─────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteMutation = useMutation({
    mutationFn: ({ author, source }: { author: string; source: string }) =>
      removeWatchedAuthor(author, source),
    onSuccess: (_, { author }) => {
      queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.posts(authorNames) })
      toast.success(`"${author}" 삭제됨`)
      setDeletingId(null)
    },
    onError: () => {
      toast.error('삭제 실패')
      setDeletingId(null)
    },
  })

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (authorNames.includes(trimmed)) {
      toast.error('이미 등록된 작성자예요')
      return
    }
    addMutation.mutate(trimmed)
  }, [inputValue, authorNames, addMutation])

  const handleDelete = useCallback(
    (id: string, author: string) => {
      const wa = watchedAuthors.find((w) => w.id === id)
      if (!wa) return
      setDeletingId(id)
      deleteMutation.mutate({ author: wa.author, source: wa.source })
    },
    [watchedAuthors, deleteMutation]
  )

  // ── 수동 스크래핑 트리거 ──────────────────────────────────
  const handleScrapeNow = useCallback(async () => {
    if (isScraping) return
    setIsScraping(true)
    try {
      const res = await fetch('/api/cron/scrape-author')
      const json = await res.json()

      if (json.message) {
        // 수집 대상 없음
        toast('수집할 작성자가 없어요', { icon: 'ℹ️' })
      } else if (json.ok) {
        const inserted = json.total_inserted ?? 0
        const failed = json.failed?.length ?? 0
        if (failed > 0) {
          toast.success(
            `완료 — ${inserted}건 저장 (${failed}명 일부 오류)`,
            { duration: 4000 }
          )
          console.warn('[scrape-author] 부분 실패:', json.failed)
        } else {
          toast.success(`수집 완료 — ${inserted}건 저장`)
        }
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.posts(authorNames) })
      } else {
        // 전원 실패
        const errMsg = json.results?.[0]?.errors?.[0] ?? '알 수 없는 오류'
        toast.error(`수집 실패: ${errMsg}`)
        console.error('[scrape-author] 전체 실패:', json)
      }
    } catch {
      toast.error('서버 연결 실패')
    } finally {
      setIsScraping(false)
    }
  }, [isScraping, queryClient, authorNames])

  // ── 작성자 게시글 드릴다운 ────────────────────────────────
  if (selectedAuthor) {
    return (
      <AuthorPostsView
        author={selectedAuthor}
        onBack={() => setSelectedAuthor(null)}
      />
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-main)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-main)', background: 'var(--bg-main)' }}
      >
        <h1 className="text-[17px] font-bold" style={{ color: 'var(--text-main)' }}>
          관심 작성자
        </h1>
        <button
          onClick={handleScrapeNow}
          disabled={isScraping || watchedAuthors.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
          title="지금 즉시 스크래핑"
        >
          <BiRefresh size={14} className={isScraping ? 'animate-spin' : ''} />
          {isScraping ? '수집 중...' : '지금 수집'}
        </button>
      </div>

      {/* 탭 */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sub)' }}
      >
        {(['feed', 'authors'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-[13px] font-semibold transition-colors relative"
            style={{ color: tab === t ? 'var(--point-color)' : 'var(--text-muted)' }}
          >
            {t === 'feed' ? '📰 피드' : `👥 작성자 ${watchedAuthors.length > 0 ? `(${watchedAuthors.length})` : ''}`}
            {tab === t && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                style={{ background: 'var(--point-color)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {tab === 'feed' ? (
          <FeedView authors={authorNames} />
        ) : (
          <AuthorsTab
            watchedAuthors={watchedAuthors}
            authorsLoading={authorsLoading}
            inputValue={inputValue}
            setInputValue={setInputValue}
            inputRef={inputRef}
            onAdd={handleAdd}
            isAdding={addMutation.isPending}
            onDelete={handleDelete}
            deletingId={deletingId}
            onSelect={setSelectedAuthor}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 작성자 탭 서브 컴포넌트
// ─────────────────────────────────────────────────────────────
function AuthorsTab({
  watchedAuthors,
  authorsLoading,
  inputValue,
  setInputValue,
  inputRef,
  onAdd,
  isAdding,
  onDelete,
  deletingId,
  onSelect,
}: {
  watchedAuthors: WatchedAuthor[]
  authorsLoading: boolean
  inputValue: string
  setInputValue: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onAdd: () => void
  isAdding: boolean
  onDelete: (id: string, author: string) => void
  deletingId: string | null
  onSelect: (author: string) => void
}) {
  return (
    <div className="flex flex-col">
      {/* 추가 입력란 */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-main)' }}
      >
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-sub)', border: '1px solid var(--border-main)' }}
        >
          <BiUser size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--text-main)' }}
            placeholder="닉네임 입력 후 추가"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            maxLength={50}
          />
          {inputValue && (
            <button onClick={() => setInputValue('')} aria-label="지우기">
              <BiX size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={!inputValue.trim() || isAdding}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all disabled:opacity-40 active:scale-95"
          style={{ background: 'var(--point-color)', color: '#fff' }}
          aria-label="추가"
        >
          {isAdding ? (
            <BiRefresh size={18} className="animate-spin" />
          ) : (
            <BiPlus size={18} />
          )}
        </button>
      </div>

      {/* 목록 */}
      {authorsLoading ? (
        <div className="flex flex-col gap-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="skeleton-shimmer w-9 h-9 rounded-full" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="skeleton-shimmer h-3.5 w-24 rounded" />
                <div className="skeleton-shimmer h-2.5 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : watchedAuthors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
          <BiUser size={36} style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            아직 등록된 작성자가 없어요
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            위 입력란에 에펨코리아 닉네임을 입력하면<br />
            해당 작성자의 글을 자동으로 수집합니다
          </p>
        </div>
      ) : (
        watchedAuthors.map((wa) => (
          <AuthorCard
            key={wa.id}
            wa={wa}
            onSelect={onSelect}
            onDelete={onDelete}
            isDeleting={deletingId === wa.id}
          />
        ))
      )}

      {watchedAuthors.length > 0 && (
        <p className="px-4 py-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          작성자를 탭하면 게시글을 볼 수 있어요
        </p>
      )}
    </div>
  )
}
