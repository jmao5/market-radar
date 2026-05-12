'use client'

import { useState, useRef, useEffect } from 'react'
import { BiImage } from 'react-icons/bi'
import { Skeleton } from './Skeleton'
import { cn } from '@/lib/utils'

interface SmartImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'priority'> {
  src?: string | null
  alt?: string
  fallbackClassName?: string
  skeletonClassName?: string
  containerClassName?: string
  priority?: boolean
  fill?: boolean
}

export default function SmartImage({
  src,
  alt,
  className,
  fallbackClassName,
  skeletonClassName,
  containerClassName,
  priority = false,
  width,
  height,
  fill,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}: SmartImageProps) {
  const [isLoading, setIsLoading] = useState(!priority)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Use fill ONLY if explicitly provided, Next.js Image restriction no longer applies
  const useFill = fill

  useEffect(() => {
    // If image is already rendered and complete from browser cache, unset loading state
    if (imgRef.current?.complete) {
      setTimeout(() => setIsLoading(false), 0)
    }
  }, [src])

  return (
    <div className={cn('relative w-full overflow-hidden', containerClassName)}>
      {/* 1. 로딩 뼈대 (Skeleton) */}
      {isLoading && !isError && (
        <Skeleton
          className={cn('absolute inset-0 z-10 h-full w-full bg-bg-sub', skeletonClassName)}
        />
      )}

      {/* 2. 실제 이미지 렌더링 */}
      {!isError && src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={src}
          alt={alt || 'image'}
          loading={priority ? 'eager' : 'lazy'}
          width={useFill ? undefined : width}
          height={useFill ? undefined : height}
          sizes={useFill ? sizes : undefined}
          referrerPolicy="no-referrer"
          className={cn(
            'transition-opacity duration-500',
            isLoading ? 'opacity-0' : 'opacity-100',
            useFill && 'absolute inset-0 h-full w-full object-cover',
            className,
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setIsError(true)
          }}
          {...props}
        />
      ) : (
        /* 3. 에러 발생 시 Fallback UI */
        (isError || (!src && !isLoading)) && (
          <div
            className={cn(
              'z-0 flex w-full flex-col items-center justify-center bg-bg-sub/50 text-text-sub/40 backdrop-blur-sm',
              useFill ? 'absolute inset-0 h-full' : 'relative min-h-[300px]',
              fallbackClassName,
            )}
          >
            <BiImage size={32} className="opacity-50" />
            <span className="mt-2 text-[11px] font-bold tracking-wider">NO IMAGE</span>
          </div>
        )
      )}
    </div>
  )
}
