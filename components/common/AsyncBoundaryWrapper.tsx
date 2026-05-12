'use client'

import AsyncBoundary from '@/components/common/AsyncBoundary'
import { ReactNode } from 'react'
import Loading from '@/components/ui/Loading'

interface Props {
  children: ReactNode
  // [추가] 커스텀 로딩 UI를 받을 수 있도록 옵셔널 prop 추가
  loadingFallback?: ReactNode
}

export default function AsyncBoundaryWrapper({ children, loadingFallback }: Props) {
  return (
    <AsyncBoundary
      // 1. 로딩 UI: 외부에서 주입된 fallback이 있으면 그걸 쓰고, 없으면 기본 스피너 사용
      pendingFallback={loadingFallback ?? <Loading />}
      // 2. 에러 UI (기존 유지)
      rejectedFallback={({ error, reset }) => (
        <div className="flex h-60 flex-col items-center justify-center gap-4 text-center">
          <p className="font-bold text-red-500">에러가 발생했습니다.</p>
          <p className="text-sm text-gray-500">{error.message}</p>
          <button
            onClick={reset}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-300"
          >
            다시 시도하기
          </button>
        </div>
      )}
    >
      {children}
    </AsyncBoundary>
  )
}
