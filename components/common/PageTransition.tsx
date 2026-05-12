'use client'

import { m } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  id: string // 애니메이션 트리거를 위한 고유 키 (예: chapterId)
}

export default function PageTransition({ children, id }: PageTransitionProps) {
  return (
    <m.div
      key={id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        ease: 'easeOut',
        stiffness: 260,
        damping: 20 }}
      className="w-full min-h-full"
    >
      {children}
    </m.div>
  )
}
