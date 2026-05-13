'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileView } from '@/components/home/MobileView'
import { DesktopView } from '@/components/home/DesktopView'

// ── 메인 진입점 ───────────────────────────────────────────────
export default function HomeClient() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileView /> : <DesktopView />
}

