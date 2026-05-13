import dayjs from 'dayjs'
import { BiRefresh, BiSearch, BiTime, BiShow, BiChevronLeft, BiChevronRight, BiUserCheck } from 'react-icons/bi'
import { useMarketData } from '@/hooks/useMarketData'
import { MarketIndexCard, MarketIndexSkeleton } from './MarketIndexCard'
import { DesktopPostRow } from './PostRow'
import Link from 'next/link'

export function DesktopView() {
  const {
    indices,
    indicesLoading,
    posts,
    postsLoading,
    page,
    setPage,
    totalCount,
    limit,
    isRefreshing,
    lastUpdated,
    handleRefresh,
    searchQuery,
    setSearchQuery,
  } = useMarketData({ viewType: 'desktop' })

  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const maxPageButtons = 5

  let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2))
  let endPage = startPage + maxPageButtons - 1
  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(1, endPage - maxPageButtons + 1)
  }

  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 상단 헤더 바 */}
      <div className="flex items-center justify-between px-8 py-5 flex-shrink-0 bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-main)] relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--point-color)] to-[var(--point-hover)] flex items-center justify-center shadow-sm">
            <span className="text-white text-[18px]">📡</span>
          </div>
          <div>
            <h1 className="text-[19px] font-bold text-[var(--text-main)] tracking-tight">대시보드</h1>
            <p className="text-[13px] mt-0.5 text-[var(--text-muted)] font-medium">
              주식 갤러리 실시간 현황
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-sub)] bg-[var(--bg-sub)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
            <BiTime size={14} className="text-[var(--text-muted)]" />
            {dayjs(lastUpdated).format('MM/DD HH:mm')} 기준
          </div>
          {/* 관심 작성자 버튼 */}
          <Link
            href="/users"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.95] bg-[var(--bg-sub)] hover:bg-[var(--bg-card)] text-[var(--text-sub)] border border-[var(--border-main)] shadow-sm"
          >
            <BiUserCheck size={16} />
            관심 작성자
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.95] disabled:opacity-50 bg-[var(--point-color)] hover:bg-[var(--point-hover)] text-white shadow-sm hover:shadow-md"
          >
            <BiRefresh size={16} className={isRefreshing ? 'animate-loading-spin' : ''} />
            {isRefreshing ? '갱신 중...' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {/* 지수 카드 그리드 */}
        <section>
          <p className="text-[11px] font-bold mb-3 tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--point-color)]"></span>
            시장 지수
          </p>
          <div className="flex gap-4 flex-wrap">
            {indicesLoading ? (
              [1, 2, 3, 4].map((i) => <MarketIndexSkeleton key={i} />)
            ) : indices && indices.length > 0 ? (
              indices.map((idx) => <MarketIndexCard key={idx.id} index={idx} />)
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)]">
                지수 데이터 없음 — C단계 추가 후 표시됩니다
              </div>
            )}
          </div>
        </section>

        {/* 게시글 테이블 */}
        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--point-color)]"></span>
                주갤 정보
              </p>
              {!postsLoading && posts.length > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-main)] shadow-sm">
                  {posts.length}건
                </span>
              )}
            </div>

            {/* 검색창 */}
            <div className="relative flex items-center w-72 group">
              <BiSearch className="absolute left-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--point-color)] transition-colors" size={16} />
              <input
                type="text"
                placeholder="제목, 본문, 작성자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[13px] outline-none pl-10 pr-4 py-2 rounded-xl transition-all focus:border-[var(--point-color)] focus:ring-2 focus:ring-[var(--point-ring)] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm">
            <div className="flex-1 overflow-y-auto scrollbar-hide relative">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-main)]/90 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
                  <tr className="border-b border-[var(--border-main)]">
                    <th className="py-3.5 pl-6 pr-3 text-left text-[12px] font-semibold w-10 text-[var(--text-muted)] tracking-wider">
                      #
                    </th>
                    <th className="py-3.5 pr-4 text-left text-[12px] font-semibold text-[var(--text-sub)] tracking-wider">
                      제목
                    </th>
                    <th className="py-3.5 pr-4 text-left text-[12px] font-semibold w-32 text-[var(--text-muted)] tracking-wider">
                      작성자
                    </th>
                    <th className="py-3.5 pr-4 text-right text-[12px] font-semibold w-24 text-[var(--text-muted)] tracking-wider">
                      <span className="flex items-center justify-end gap-1">
                        <BiShow size={14} />
                        조회
                      </span>
                    </th>
                    <th className="py-3.5 pr-6 text-right text-[12px] font-semibold w-28 text-[var(--text-muted)] tracking-wider">
                      시간
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {postsLoading
                    ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)]">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="skeleton-shimmer h-3.5 w-full rounded" />
                        </td>
                      </tr>
                    ))
                    : posts.map((post, i) => (
                      <DesktopPostRow key={post.id} post={post} index={i} onAuthorClick={setSearchQuery} />
                    ))}
                </tbody>
              </table>
            </div>

            {/* 숫자 페이징 컨트롤 (데스크탑) */}
            {!postsLoading && posts.length > 0 && (
              <div className="flex-shrink-0 flex items-center justify-center gap-3 py-4 border-t border-[var(--border-main)] bg-[var(--bg-main)]/50 backdrop-blur-sm">
                <button
                  onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm bg-[var(--bg-card)] border border-[var(--border-main)]"
                >
                  <BiChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl text-[13px] font-bold transition-all shadow-sm ${page === p
                          ? 'bg-[var(--point-color)] text-white border-transparent'
                          : 'bg-[var(--bg-card)] text-[var(--text-sub)] hover:bg-[var(--bg-sub)] hover:text-[var(--point-color)] border border-[var(--border-main)]'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm bg-[var(--bg-card)] border border-[var(--border-main)]"
                >
                  <BiChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
