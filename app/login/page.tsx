'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Provider = 'kakao' | 'google'

export default function LoginPage() {
  const supabase = createClient()
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)

  const handleLogin = async (provider: Provider) => {
    if (loadingProvider) return // 이미 진행 중이면 무시
    setLoadingProvider(provider)
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })
      // signInWithOAuth는 리다이렉트가 시작되면 여기 도달하지 않음
      // 에러 시에만 도달하므로 finally에서 상태 초기화
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
        로그인
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        소셜 계정으로 시작하세요
      </p>

      <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
        {/* 카카오 로그인 */}
        <button
          onClick={() => handleLogin('kakao')}
          disabled={!!loadingProvider}
          className="relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ background: '#FEE500', color: '#191919' }}
          aria-label="카카오로 로그인"
        >
          {loadingProvider === 'kakao' ? (
            <>
              <span
                className="h-4 w-4 animate-loading-spin rounded-full border-2"
                style={{ borderColor: '#19191940', borderTopColor: '#191919' }}
              />
              로그인 중...
            </>
          ) : (
            '카카오로 로그인'
          )}
        </button>

        {/* Google 로그인 */}
        <button
          onClick={() => handleLogin('google')}
          disabled={!!loadingProvider}
          className="relative flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-main)',
            color: 'var(--text-main)',
          }}
          aria-label="Google로 로그인"
        >
          {loadingProvider === 'google' ? (
            <>
              <span
                className="h-4 w-4 animate-loading-spin rounded-full border-2"
                style={{
                  borderColor: 'var(--border-strong)',
                  borderTopColor: 'var(--point-color)',
                }}
              />
              로그인 중...
            </>
          ) : (
            'Google로 로그인'
          )}
        </button>
      </div>
    </div>
  )
}
