'use client'

import { clsx } from 'clsx'
import { ReactNode, useEffect, useState } from 'react'
import Image from 'next/image'

// lottie-react는 optional — waiting.json이 있을 때만 동적 import
let LottieComponent: React.ComponentType<{
  animationData: unknown
  loop: boolean
  style?: React.CSSProperties
}> | null = null

type LoadingVariant = 'spinner' | 'dots' | 'image' | 'lottie'

interface LoadingProps {
  /** 로딩 스타일 (기본값: 'spinner') */
  variant?: LoadingVariant
  /** 화면 전체를 덮을지 여부 (기본값: true) */
  fullScreen?: boolean
  /** 표시할 메시지 */
  message?: ReactNode
  /** 메시지를 표시하기 전 대기 시간 (ms, 기본값: 1000) */
  messageDelay?: number
  /** 커스텀 클래스 */
  className?: string
  /** 스피너·점 색상 */
  color?: string
  /** 정적 이미지 경로 (variant="image" 일 때) */
  imageSrc?: string
  /** 이미지/Lottie 크기 px (기본값: 100) */
  imageSize?: number
  /** Lottie JSON 데이터 (variant="lottie" 이고 외부에서 직접 넘길 때) */
  animationData?: unknown
}

export default function Loading({
  variant = 'spinner', // lottie 파일 유무와 무관하게 항상 동작하는 안전한 기본값
  fullScreen = true,
  message,
  messageDelay = 1000,
  className,
  color = 'var(--point-color)',
  imageSrc = '/logo.png',
  imageSize = 100,
  animationData,
}: LoadingProps) {
  const [mounted, setMounted] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [lottieData, setLottieData] = useState<unknown>(animationData ?? null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setShowMessage(true), messageDelay)
    return () => clearTimeout(timer)
  }, [message, messageDelay])

  // variant="lottie" 일 때만 동적으로 JSON + 라이브러리 로드
  useEffect(() => {
    if (variant !== 'lottie') return
    if (lottieData) return // 이미 있으면 스킵

    // lottie-react 동적 import (없으면 spinner 폴백)
    import('lottie-react')
      .then((mod) => {
        LottieComponent = mod.default
      })
      .catch(() => {
        // lottie-react 없으면 spinner로 폴백 — 런타임 에러 없음
      })

    if (!animationData) {
      fetch('/lottie/waiting.json')
        .then((res) => res.json())
        .then((data) => setLottieData(data))
        .catch(() => {
          // waiting.json 없어도 spinner로 폴백
        })
    }
  }, [variant, animationData, lottieData])

  if (!mounted) return null

  // lottie 요청했지만 데이터/라이브러리 미준비 → spinner로 폴백
  const effectiveVariant =
    variant === 'lottie' && (!lottieData || !LottieComponent) ? 'spinner' : variant

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx(
        'flex flex-col items-center justify-center gap-6',
        fullScreen
          ? 'fixed inset-0 z-[9999] h-screen w-full bg-white/80 dark:bg-black/80 backdrop-blur-md'
          : 'w-full py-10',
        className
      )}
    >
      {effectiveVariant === 'lottie' && lottieData && LottieComponent ? (
        <LottieComponent
          animationData={lottieData}
          loop={true}
          style={{ width: imageSize, height: imageSize }}
        />
      ) : null}

      {effectiveVariant === 'spinner' && (
        <div
          className="animate-loading-spin rounded-full border-4"
          style={{
            width: 40,
            height: 40,
            borderColor: 'var(--border-main)',
            borderTopColor: color,
          }}
        />
      )}

      {effectiveVariant === 'dots' && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full animate-loading-bounce"
              style={{ backgroundColor: color, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      {effectiveVariant === 'image' && imageSrc && (
        <div className="animate-loading-pulse">
          <Image
            src={imageSrc}
            alt="로딩 중..."
            width={imageSize}
            height={imageSize}
            className="object-contain"
            priority
          />
        </div>
      )}

      {message && showMessage && (
        <p className="text-center text-sm font-bold tracking-wider text-text-sub transition-opacity duration-500">
          {message}
        </p>
      )}

      <span className="sr-only">로딩 중...</span>
    </div>
  )
}
