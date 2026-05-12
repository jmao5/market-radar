'use client'

import Link from 'next/link'
import { BiChevronRight, BiBookmark, BiHistory, BiCog, BiLogOut } from 'react-icons/bi'
import { useUserStore } from '@/stores/userStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const MENU_ITEMS = [
  { label: '즐겨찾기', href: '/my/favorites', icon: BiBookmark },
  { label: '방문 기록', href: '/my/records',   icon: BiHistory },
  { label: '설정',     href: '/my/settings',  icon: BiCog },
]

export default function MyPageClient() {
  const { user } = useUserStore()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다')
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-text-muted text-sm">로그인이 필요합니다</p>
        <Link href="/login" className="btn-primary rounded-full px-6 py-2 text-sm font-semibold">
          로그인
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">
      {/* 프로필 */}
      <div className="px-4 py-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: 'var(--point-color)', color: '#fff' }}
          >
            {user.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-text-main font-semibold">
              {user.user_metadata?.name ?? user.email}
            </p>
            <p className="text-text-muted text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="flex flex-col">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-4 active:opacity-60"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <item.icon size={20} style={{ color: 'var(--text-sub)' }} />
            <span className="flex-1 text-text-main text-sm">{item.label}</span>
            <BiChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 active:opacity-60"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <BiLogOut size={20} style={{ color: 'var(--text-sub)' }} />
          <span className="flex-1 text-left text-text-main text-sm">로그아웃</span>
        </button>
      </div>
    </div>
  )
}
