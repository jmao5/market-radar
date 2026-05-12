'use client'

import { ErrorBoundary } from '@suspensive/react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, ReactNode, ComponentProps } from 'react'

export default function AsyncBoundary({
  pendingFallback,
  rejectedFallback,
  children }: {
  pendingFallback: ReactNode // 로딩 중 보여줄 UI
  rejectedFallback: ComponentProps<typeof ErrorBoundary>['fallback'] // 에러 시 보여줄 UI
  children: ReactNode
}) {
  // [핵심] React Query의 캐시를 초기화해주는 훅
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      onReset={reset} // 에러 경계가 리셋될 때 React Query 캐시도 같이 리셋
      fallback={rejectedFallback}
    >
      <Suspense fallback={pendingFallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}
