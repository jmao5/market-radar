'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'framer-motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[] // vh 단위, e.g. [50, 90] — 향후 확장용
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // SSR-safe portal: 마운트 후에만 portal 대상 DOM을 탐색
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 클라이언트 마운트 후 app-root 탐색 → hydration mismatch 방지
    setPortalRoot(document.getElementById('app-root'))
  }, [])

  // Escape 키 핸들러
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // portal 대상이 아직 없으면 아무것도 렌더하지 않음 (SSR / 마운트 전)
  if (!portalRoot) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
            onClick={onClose}
          />

          {/* 시트 */}
          <m.div
            ref={sheetRef}
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              zIndex: 101,
              maxHeight: '90%',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: 'var(--border-strong)' }}
              />
            </div>

            {/* 타이틀 */}
            {title && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>
                  {title}
                </h2>
              </div>
            )}

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-safe">
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    portalRoot
  )
}
