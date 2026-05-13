'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import AdminSidebar from '@/components/layout/AdminSidebar'

export default function AppFrame({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()

  // ── 모바일: 기존 max-w-md 중앙 정렬 PWA 레이아웃 ────────────
  if (isMobile) {
    return (
      <div
        className="flex h-[100dvh] w-screen items-center justify-center overscroll-none transition-colors duration-200"
        style={{ background: '#000' }}
      >
        <div
          id="app-root"
          className="relative flex w-full max-w-md flex-col h-full overflow-hidden"
          style={{
            background: 'var(--bg-main)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  // ── 데스크탑: 좌측 사이드바 + 우측 콘텐츠 Admin 레이아웃 ────
  return (
    <div
      className="flex h-[100dvh] w-screen overflow-hidden"
      style={{ background: 'var(--bg-sub)' }}
    >
      <AdminSidebar />
      <div
        id="app-root"
        className="flex flex-1 flex-col overflow-hidden"
        style={{ background: 'var(--bg-sub)' }}
      >
        {children}
      </div>
    </div>
  )
}
