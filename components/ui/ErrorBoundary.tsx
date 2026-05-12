'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 에러 발생 시 렌더할 폴백 UI. 생략하면 기본 UI 사용 */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
}

interface State {
  error: Error | null
}

/**
 * ErrorBoundary — 클라이언트 렌더 에러를 격리하여 앱 전체 크래시를 방지
 *
 * app/error.tsx는 라우트 세그먼트 단위 복구용이고,
 * 이 컴포넌트는 컴포넌트 트리 특정 구간만 격리할 때 사용.
 *
 * 사용 예)
 *   <ErrorBoundary fallback={<p>이 영역을 불러오지 못했어요</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 *   // reset 콜백이 필요한 경우
 *   <ErrorBoundary fallback={(err, reset) => (
 *     <button onClick={reset}>다시 시도</button>
 *   )}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 여기서 Sentry 등 에러 리포팅 서비스로 전송 가능
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) {
        return typeof fallback === 'function' ? fallback(error, this.reset) : fallback
      }

      // 기본 폴백 UI
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-sub)' }}>
            이 영역을 불러오지 못했어요
          </p>
          <button
            onClick={this.reset}
            className="rounded-full px-4 py-2 text-sm font-semibold btn-outline"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return children
  }
}
