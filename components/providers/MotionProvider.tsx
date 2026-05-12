'use client'

import { LazyMotion, domAnimation } from 'framer-motion'

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    // domAnimation 번들만 로드 (~15KB) — domMax 대비 40% 절감
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
