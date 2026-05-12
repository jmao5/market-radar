import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'

type Role = 'user' | 'admin'

interface UserState {
  session: Session | null
  user: User | null
  role: Role
  isLoading: boolean
  setSession: (session: Session | null) => void
  setRole: (role: Role) => void
  clearSession: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      role: 'user',
      isLoading: true,

      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isLoading: false,
        }),

      setRole: (role) => set({ role }),

      clearSession: () =>
        set({
          session: null,
          user: null,
          role: 'user',
          isLoading: false,
        }),
    }),
    {
      name: 'user-storage',
      // 민감한 세션 토큰은 persist 제외, role만 저장
      partialize: (state) => ({ role: state.role }),
    }
  )
)
