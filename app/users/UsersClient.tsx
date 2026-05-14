'use client'

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
  BiReset,
} from 'react-icons/bi'
import type { WatchedAuthor } from '@/types/market'

dayjs.extend(relativeTime)
dayjs.locale('ko')

// ─────────────────────────────────────────────────────────────
// 작성자별 게시글 드릴다운 뷰
// ─────────────────────────────────────────────────────────────
function AuthorPostsView({ author, onBack }: { author: string; onBack: () => void }) {
  const { ref, inView } = useInView()
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: watchedAuthorQueryKeys.posts([author]),
    queryFn: ({ pageParam }) =>
      getWatchedAuthorPosts({ authors: [author], limit: 30, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--bg-main)' }}>
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: 'var(--bg-sub)' }}
        >
          <BiArrowBack size={16} style={{ color: 'var(--text-main)' }} />
        </button>
        <div className="flex flex-col flex-1">
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

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
            <BiNews size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>저장된 게시글이 없어요</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>수집 버튼을 눌러보세요</p>
          </div>
        ) : (
          <>
            {posts.map((post) => <MobilePostRow key={post.id} post={post} />)}
            {hasNextPage && (
              <div ref={ref} className="py-6 flex justify-center">
                {isFetchingNextPage && <BiRefresh className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />}
              </div>
            )}
            {!hasNextPage && posts.length > 0 && (
              <p className="py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>모든 게시글을 불러왔습니다</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 작성자별 섹션 (그룹 뷰)
// ─────────────────────────────────────────────────────────────
function AuthorSection({ author, onSelect }: { author: string; onSelect: (a: string) => void }) {
  const PREVIEW = 5
  const { data, isLoading } = useQuery({
    queryKey: [...watchedAuthorQueryKeys.posts([author]), 'preview'],
    queryFn: () => getWatchedAuthorPosts({ authors: [author], limit: PREVIEW }),
    staleTime: 1000 * 60 * 3,
  })
  const posts = data?.items ?? []
  const total = data?.totalCount ?? 0

  return (
    <div className="flex flex-col" style={{ borderBottom: '6px solid var(--bg-sub)' }}>
      <button
        onClick={() => onSelect(author)}
        className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-[var(--bg-sub)]"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0"
          style={{ background: 'var(--point-color)20', color: 'var(--point-color)' }}
        >
          {author.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-[14px] font-bold truncate" style={{ color: 'var(--text-main)' }}>{author}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? '로딩...' : `게시글 ${total}건`}
          </span>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
          style={{ background: 'var(--bg-sub)', color: 'var(--point-color)', border: '1px solid var(--border-main)' }}
        >
          전체보기 →
        </span>
      </button>

      {isLoading
        ? [1, 2, 3].map((i) => <PostSkeleton key={i} />)
        : posts.length === 0
        ? <div className="flex items-center justify-center py-6"><p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>수집된 게시글 없음</p></div>
        : <>
            {posts.map((post) => <MobilePostRow key={post.id} post={post} />)}
            {total > PREVIEW && (
              <button
                onClick={() => onSelect(author)}
                className="py-3 text-center text-[12px] font-semibold active:opacity-60"
                style={{ color: 'var(--point-color)', borderTop: '1px solid var(--border-subtle)' }}
              >
                +{total - PREVIEW}건 더 보기
              </button>
            )}
          </>
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 피드 뷰 (그룹 / 시간순 토글)
// ─────────────────────────────────────────────────────────────
type FeedMode = 'grouped' | 'timeline'

function FeedView({ authors, onSelectAuthor }: { authors: string[]; onSelectAuthor: (a: string) => void }) {
  const [mode, setMode] = useState<FeedMode>('grouped')
  const { ref, inView } = useInView()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [...watchedAuthorQueryKeys.posts(authors), 'timeline'],
    queryFn: ({ pageParam }) =>
      getWatchedAuthorPosts({ authors, limit: 30, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 1000 * 60 * 3,
    enabled: authors.length > 0 && mode === 'timeline',
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <BiUser size={40} style={{ color: 'var(--text-muted)' }} />
        <p className="text-[15px] font-bold" style={{ color: 'var(--text-sub)' }}>관심 작성자를 추가해보세요</p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          작성자 탭에서 닉네임을 등록하면<br />그 사람의 게시글을 여기서 모아볼 수 있어요
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* 모드 토글 */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 sticky top-0 z-10"
        style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        {(['grouped', 'timeline'] as FeedMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
            style={{
              background: mode === m ? 'var(--point-color)' : 'var(--bg-sub)',
              color: mode === m ? '#fff' : 'var(--text-muted)',
              border: mode === m ? 'none' : '1px solid var(--border-main)',
            }}
          >
            {m === 'grouped' ? '👤 작성자별' : '🕐 시간순'}
          </button>
        ))}
      </div>

      {mode === 'grouped' ? (
        authors.map((a) => <AuthorSection key={a} author={a} onSelect={onSelectAuthor} />)
      ) : (
        <>
          {isLoading
            ? [1,2,3,4,5,6].map((i) => <PostSkeleton key={i} />)
            : posts.length === 0
            ? (
              <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
                <BiNews size={32} style={{ color: 'var(--text-muted)' }} />
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>아직 수집된 게시글이 없어요</p>
              </div>
            )
            : posts.map((post) => <MobilePostRow key={post.id} post={post} />)
          }
          {hasNextPage && (
            <div ref={ref} className="py-6 flex justify-center">
              {isFetchingNextPage && <BiRefresh className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />}
            </div>
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>모든 게시글을 불러왔습니다</p>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 작성자 카드
// ─────────────────────────────────────────────────────────────
function AuthorCard({
  wa, onSelect, onDelete, isDeleting,
}: {
  wa: WatchedAuthor
  onSelect: (author: string) => void
  onDelete: (id: string, author: string) => void
  isDeleting: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] flex-shrink-0"
        style={{ background: 'var(--point-color)20', color: 'var(--point-color)' }}
      >
        {wa.author.slice(0, 1).toUpperCase()}
      </div>
      <button className="flex-1 flex flex-col items-start gap-0.5 text-left min-w-0" onClick={() => onSelect(wa.author)}>
        <span className="text-[14px] font-semibold truncate w-full" style={{ color: 'var(--text-main)' }}>{wa.author}</span>
        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <BiTime size={11} />
          {wa.last_scraped_at ? `마지막 수집 ${dayjs(wa.last_scraped_at).fromNow()}` : '아직 수집 전'}
        </span>
      </button>
      <button
        onClick={() => onDelete(wa.id, wa.author)}
        disabled={isDeleting}
        className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40"
        style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)' }}
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
  const [isResetting, setIsResetting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: watchedAuthors = [], isLoading: authorsLoading } = useQuery({
    queryKey: watchedAuthorQueryKeys.all(),
    queryFn: getWatchedAuthors,
    staleTime: 1000 * 60 * 2,
  })
  const authorNames = watchedAuthors.map((w) => w.author)

  const addMutation = useMutation({
    mutationFn: (author: string) => addWatchedAuthor(author),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
      toast.success(`"${data.author}" 추가됨`)
      setInputValue('')
    },
    onError: (err: Error) => {
      toast.error(err.message.includes('unique') ? '이미 등록된 작성자예요' : '추가 실패: ' + err.message)
    },
  })

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
    onError: () => { toast.error('삭제 실패'); setDeletingId(null) },
  })

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (authorNames.includes(trimmed)) { toast.error('이미 등록된 작성자예요'); return }
    addMutation.mutate(trimmed)
  }, [inputValue, authorNames, addMutation])

  const handleDelete = useCallback((id: string, author: string) => {
    const wa = watchedAuthors.find((w) => w.id === id)
    if (!wa) return
    setDeletingId(id)
    deleteMutation.mutate({ author: wa.author, source: wa.source })
  }, [watchedAuthors, deleteMutation])

  // ── 지금 수집 ────────────────────────────────────────────
  const handleScrapeNow = useCallback(async () => {
    if (isScraping || watchedAuthors.length === 0) return
    setIsScraping(true)
    const loadingToast = toast.loading('수집 중...')
    try {
      const res = await fetch('/api/cron/scrape-author', { cache: 'no-store' })
      const json = await res.json()
      toast.dismiss(loadingToast)
      if (json.message) {
        toast('수집할 작성자가 없어요', { icon: 'ℹ️' })
      } else {
        const inserted = json.total_inserted ?? 0
        toast.success(`완료 — ${inserted}건 저장`)
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.posts(authorNames) })
      }
    } catch {
      toast.dismiss(loadingToast)
      toast.error('서버 연결 실패')
    } finally {
      setIsScraping(false)
    }
  }, [isScraping, watchedAuthors.length, queryClient, authorNames])

  // ── 전체 초기화 + 재수집 ──────────────────────────────────
  const handleResetAll = useCallback(async () => {
    if (isResetting) return
    const confirmed = window.confirm(
      `등록된 ${watchedAuthors.length}명의 수집 게시글을 모두 삭제하고 처음부터 다시 수집할까요?`
    )
    if (!confirmed) return

    setIsResetting(true)
    const loadingToast = toast.loading('초기화 중...')
    try {
      const res = await fetch('/api/watched-authors/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      toast.dismiss(loadingToast)
      if (json.ok) {
        toast.success(`초기화 완료 — ${json.deleted}건 삭제, 재수집 시작`)
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.all() })
        queryClient.invalidateQueries({ queryKey: watchedAuthorQueryKeys.posts(authorNames) })
      } else {
        toast.error('초기화 실패: ' + (json.error ?? '알 수 없는 오류'))
      }
    } catch {
      toast.dismiss(loadingToast)
      toast.error('서버 연결 실패')
    } finally {
      setIsResetting(false)
    }
  }, [isResetting, watchedAuthors.length, queryClient, authorNames])

  if (selectedAuthor) {
    return <AuthorPostsView author={selectedAuthor} onBack={() => setSelectedAuthor(null)} />
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--bg-main)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-main)' }}
      >
        <h1 className="text-[17px] font-bold" style={{ color: 'var(--text-main)' }}>
          관심 작성자
        </h1>
        <div className="flex items-center gap-2">
          {/* 초기화 버튼 */}
          {watchedAuthors.length > 0 && (
            <button
              onClick={handleResetAll}
              disabled={isResetting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--bg-sub)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
              title="수집 데이터 초기화 후 재수집"
            >
              <BiReset size={13} className={isResetting ? 'animate-spin' : ''} />
              초기화
            </button>
          )}
          {/* 지금 수집 버튼 */}
          <button
            onClick={handleScrapeNow}
            disabled={isScraping || watchedAuthors.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-sub)', color: 'var(--text-sub)', border: '1px solid var(--border-main)' }}
          >
            <BiRefresh size={14} className={isScraping ? 'animate-spin' : ''} />
            {isScraping ? '수집 중...' : '지금 수집'}
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sub)' }}>
        {(['feed', 'authors'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-[13px] font-semibold relative"
            style={{ color: tab === t ? 'var(--point-color)' : 'var(--text-muted)' }}
          >
            {t === 'feed' ? '📰 피드' : `👥 작성자${watchedAuthors.length > 0 ? ` (${watchedAuthors.length})` : ''}`}
            {tab === t && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                style={{ background: 'var(--point-color)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {tab === 'feed' ? (
          <FeedView authors={authorNames} onSelectAuthor={setSelectedAuthor} />
        ) : (
          <div className="flex flex-col">
            {/* 입력란 */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  maxLength={50}
                />
                {inputValue && (
                  <button onClick={() => setInputValue('')}><BiX size={16} style={{ color: 'var(--text-muted)' }} /></button>
                )}
              </div>
              <button
                onClick={handleAdd}
                disabled={!inputValue.trim() || addMutation.isPending}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95"
                style={{ background: 'var(--point-color)', color: '#fff' }}
              >
                {addMutation.isPending ? <BiRefresh size={18} className="animate-spin" /> : <BiPlus size={18} />}
              </button>
            </div>

            {/* 작성자 목록 */}
            {authorsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="skeleton-shimmer w-9 h-9 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="skeleton-shimmer h-3.5 w-24 rounded" />
                    <div className="skeleton-shimmer h-2.5 w-32 rounded" />
                  </div>
                </div>
              ))
            ) : watchedAuthors.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
                <BiUser size={36} style={{ color: 'var(--text-muted)' }} />
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>아직 등록된 작성자가 없어요</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  위 입력란에 에펨코리아 닉네임을 입력하면<br />해당 작성자의 글을 자동으로 수집합니다
                </p>
              </div>
            ) : (
              <>
                {watchedAuthors.map((wa) => (
                  <AuthorCard
                    key={wa.id}
                    wa={wa}
                    onSelect={setSelectedAuthor}
                    onDelete={handleDelete}
                    isDeleting={deletingId === wa.id}
                  />
                ))}
                <p className="px-4 py-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  작성자를 탭하면 게시글을 볼 수 있어요
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
