'use client'

import { BiSun, BiMoon } from 'react-icons/bi'
import { useUiStore } from '@/stores/uiStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useUiStore()

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-60"
      style={{ background: 'var(--bg-sub)' }}
      aria-label="테마 전환"
    >
      {theme === 'dark' ? (
        <BiSun size={18} style={{ color: 'var(--text-sub)' }} />
      ) : (
        <BiMoon size={18} style={{ color: 'var(--text-sub)' }} />
      )}
    </button>
  )
}
