'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUiStore } from '@/stores/uiStore'

/**
 * 모바일 상단 상태바(Status Bar) 색상을 경로와 테마에 맞춰 동적으로 변경하는 훅
 */
export function useStatusBar() {
  const pathname = usePathname()
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    // 뷰어 페이지인지 확인
    const isViewer = pathname.startsWith('/chapter/image') || pathname.startsWith('/chapter/text')
    
    // 타겟 색상 결정
    let color = '#ffffff' // 기본 라이트 모드
    if (isViewer) {
      color = '#000000' // 뷰어는 항상 다크
    } else if (theme === 'dark') {
      color = '#121212' // 일반 다크 모드
    }

    // meta 태그 업데이트
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', color)
  }, [pathname, theme])
}
