'use client'

import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { BiArrowToTop, BiPlus } from 'react-icons/bi'
import { usePathname, useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/userStore'

const SCROLL_TOP_BUTTON_THRESHOLD = 300
const HIDE_FLOATING_ACTIONS_PATHS = ['/login', '/onboarding']

export default function FloatingActions() {
  const pathname = usePathname()
  const router = useRouter()
  const getScrollEl = () =>
    document.querySelector<HTMLElement>('[data-scroll-main]') || document.documentElement

  const scrollToTop = () => {
    const el = document.querySelector<HTMLElement>('[data-scroll-main]')
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isHidden = HIDE_FLOATING_ACTIONS_PATHS.some(p => pathname.startsWith(p))
  const isHome = pathname === '/'

  // cleanup ref: 이전 리스너를 명시적으로 추적해 누수 방지
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // 이전 리스너가 있으면 먼저 해제
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    // pathname 전환 후 DOM이 반영될 때까지 잠깐 대기
    const timer = setTimeout(() => {
      const el = getScrollEl()
      if (!el) return

      const handleScroll = () => {
        const scrollTop = el === document.documentElement ? window.scrollY : el.scrollTop
        setShowScrollTop(scrollTop > SCROLL_TOP_BUTTON_THRESHOLD)
      }

      const target = el === document.documentElement ? window : el
      target.addEventListener('scroll', handleScroll, { passive: true })

      // cleanup을 ref에 저장 → 다음 effect 실행 시 또는 언마운트 시 해제
      cleanupRef.current = () => target.removeEventListener('scroll', handleScroll)
    }, 100)

    return () => {
      clearTimeout(timer)
      // 언마운트 또는 pathname 변경 시 리스너 해제
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleAdd = () => {
    const { user } = useUserStore.getState()
    if (user) {
      router.push('/new')
    } else {
      router.push('/login?next=/new')
    }
  }

  if (!mounted || isHidden) return null

  return (
    <AnimatePresence>
      {isHome && (
        <m.button
          key="add-item"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          onClick={handleAdd}
          className="absolute right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-point shadow-lg text-white active:scale-90"
          style={{ bottom: 'calc(4rem + 1rem)' }}
          aria-label="새로 만들기"
        >
          <BiPlus size={24} />
        </m.button>
      )}

      {showScrollTop && (
        <m.button
          key="scroll-top"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          onClick={scrollToTop}
          className="absolute right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-bg-sub shadow-card border border-border-main text-text-sub active:scale-90"
          style={{
            bottom: isHome ? 'calc(4rem + 5rem)' : 'calc(4rem + 1rem)',
          }}
          aria-label="맨 위로"
        >
          <BiArrowToTop size={20} />
        </m.button>
      )}
    </AnimatePresence>
  )
}
