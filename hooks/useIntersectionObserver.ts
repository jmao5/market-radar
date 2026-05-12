import { useEffect, useRef } from 'react'

interface UseIntersectionObserverOptions {
  rootMargin?: string
  threshold?: number | number[]
  onObserve: () => void
  enabled?: boolean
  root?: HTMLElement | null
}

/**
 * useIntersectionObserver
 *
 * 반환값: `observerRef` — 관찰할 요소에 ref로 붙이면 됩니다.
 *
 * 사용 예)
 *   const ref = useIntersectionObserver({ onObserve: fetchNextPage })
 *   return <div ref={ref} />
 */
export default function useIntersectionObserver({
  rootMargin = '0px',
  threshold = 0,
  onObserve,
  enabled = true,
  root = null,
}: UseIntersectionObserverOptions): React.RefObject<HTMLDivElement | null> {
  const observerRef = useRef<HTMLDivElement>(null)
  // onObserve를 ref로 래핑해 stale closure 방지
  const onObserveRef = useRef(onObserve)

  useEffect(() => {
    onObserveRef.current = onObserve
  }, [onObserve])

  useEffect(() => {
    const element = observerRef.current
    if (!element || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onObserveRef.current()
        }
      },
      { root, rootMargin, threshold }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin, threshold, enabled, root])

  return observerRef
}
