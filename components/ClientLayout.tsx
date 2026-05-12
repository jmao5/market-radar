'use client'

import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'

// 네비게이션 바를 숨길 경로
const HIDE_NAVBAR_PATHS = ['/login', '/onboarding']

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNavbar = !HIDE_NAVBAR_PATHS.some((p) => pathname.startsWith(p))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      {showNavbar && <Navbar />}
    </div>
  )
}
