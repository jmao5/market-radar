'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BiHomeAlt,
  BiSearch,
  BiBookmark,
  BiUserCircle,
  BiLineChart,
  BiCog,
} from 'react-icons/bi'

const NAV_ITEMS = [
  { label: '대시보드', href: '/',           icon: BiHomeAlt,   activePath: '/' },
  { label: '검색',    href: '/search',      icon: BiSearch,    activePath: '/search' },
  { label: '관심종목', href: '/my/favorites', icon: BiBookmark,  activePath: '/my/favorites' },
  { label: '시장지수', href: '/my/records',  icon: BiLineChart, activePath: '/my/records' },
  { label: '마이페이지', href: '/my',        icon: BiUserCircle, activePath: '/my' },
]

const BOTTOM_ITEMS = [
  { label: '설정', href: '/my/settings', icon: BiCog, activePath: '/my/settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (item: { href: string; activePath: string }) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.activePath)

  return (
    <aside
      className="flex h-full w-[220px] flex-shrink-0 flex-col"
      style={{
        background: 'var(--bg-main)',
        borderRight: '1px solid var(--border-main)',
      }}
    >
      {/* 로고 */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-lg">📡</span>
        <div className="flex flex-col leading-tight">
          <span
            className="text-[13px] font-bold tracking-tight"
            style={{ color: 'var(--text-main)' }}
          >
            Market Radar
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Hub
          </span>
        </div>
      </div>

      {/* 메인 네비 */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100"
              style={{
                background: active ? 'var(--bg-sub)' : 'transparent',
                color: active ? 'var(--point-color)' : 'var(--text-sub)',
              }}
            >
              <item.icon
                size={18}
                style={{ color: active ? 'var(--point-color)' : 'var(--text-muted)', flexShrink: 0 }}
              />
              <span
                className="text-[13px]"
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {item.label}
              </span>
              {active && (
                <div
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--point-color)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* 하단 설정 */}
      <div
        className="flex flex-col gap-0.5 px-3 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100"
              style={{
                background: active ? 'var(--bg-sub)' : 'transparent',
                color: active ? 'var(--point-color)' : 'var(--text-sub)',
              }}
            >
              <item.icon
                size={18}
                style={{ color: active ? 'var(--point-color)' : 'var(--text-muted)', flexShrink: 0 }}
              />
              <span className="text-[13px]" style={{ fontWeight: active ? 600 : 400 }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* 버전 */}
        <p className="mt-2 px-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          v0.1.0 · Market Radar Hub
        </p>
      </div>
    </aside>
  )
}
