import { useUserStore } from '@/stores/userStore'

/**
 * useAuth — useUserStore의 파생 상태 래퍼
 *
 * 사용 예)
 *   const { isLoggedIn, isAdmin, user } = useAuth()
 */
export function useAuth() {
  const { session, user, role, isLoading } = useUserStore()

  return {
    session,
    user,
    role,
    isLoading,
    isLoggedIn: !!session && !!user,
    isAdmin: role === 'admin',
  }
}
