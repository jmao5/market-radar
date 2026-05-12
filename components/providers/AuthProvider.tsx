'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/stores/userStore'
import type { Session } from '@supabase/supabase-js'

export default function AuthProvider({
  session,
  children,
}: {
  session: Session | null
  children: React.ReactNode
}) {
  const { setSession, setRole, clearSession } = useUserStore()
  const initialized = useRef(false)

  // 렌더 단계에서 즉시 초기화 → 깜빡임 없음
  if (!initialized.current) {
    useUserStore.setState({
      session,
      user: session?.user ?? null,
      isLoading: false,
      role:
        (session?.user?.app_metadata?.role as 'user' | 'admin' | undefined) ??
        (session?.user?.user_metadata?.role as 'user' | 'admin' | undefined) ??
        'user',
    })
    initialized.current = true
  }

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
        const role =
          (session?.user?.app_metadata?.role as 'user' | 'admin' | undefined) ??
          (session?.user?.user_metadata?.role as 'user' | 'admin' | undefined) ??
          'user'
        setRole(role)
      } else if (event === 'SIGNED_OUT') {
        clearSession()
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
