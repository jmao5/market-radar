'use client'

import { useState } from 'react'
import { BiSearch } from 'react-icons/bi'
import { useDebounce } from '@/hooks/useDebounce'

export default function SearchClient() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 검색 헤더 */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-sub)' }}
        >
          <BiSearch size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            className="flex-1 bg-transparent text-sm outline-none selectable"
            style={{ color: 'var(--text-main)' }}
            placeholder="검색어를 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* 결과 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {debouncedQuery ? (
          <p className="text-text-muted text-sm text-center mt-8">
            &ldquo;{debouncedQuery}&rdquo; 검색 결과
          </p>
        ) : (
          <p className="text-text-muted text-sm text-center mt-8">검색어를 입력하세요</p>
        )}
      </div>
    </div>
  )
}
