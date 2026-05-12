'use client'

import { ErrorBoundary } from '@suspensive/react'
import { BiRefresh, BiErrorCircle } from 'react-icons/bi'

interface Props {
  children: React.ReactNode
  message?: string
}

export default function SectionErrorBoundary({ children, message = '데이터를 불러오지 못했습니다.' }: Props) {
  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <div className="my-8 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-main rounded-xl bg-bg-sub/50">
          <BiErrorCircle size={32} className="text-text-sub/50 mb-2" />
          <p className="text-sm text-text-sub mb-4">{message}</p>
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 bg-bg-main hover:bg-bg-sub border border-border-main rounded-full text-xs font-bold text-text-main transition-all shadow-sm active:scale-95"
          >
            <BiRefresh size={18} />
            다시 시도
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
