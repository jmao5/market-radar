'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p className="text-text-main text-lg font-bold">오류가 발생했습니다</p>
      <p className="text-text-muted text-sm text-center">{error.message}</p>
      <button
        onClick={reset}
        className="btn-primary rounded-full px-6 py-2 text-sm font-semibold"
      >
        다시 시도
      </button>
    </div>
  )
}
