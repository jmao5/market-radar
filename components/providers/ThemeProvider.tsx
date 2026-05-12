'use client'

import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUiStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
