import { useEffect, useState } from 'react'

/**
 * 지정된 시간(delay) 동안 값이 변경되지 않으면
 * 최종 value를 반환하는 커스텀 디바운스 훅입니다.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // delay 시간이 지나면 변경된 값을 세팅
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // delay 시간 내에 다시 value가 변경되면 기존 타이머 클리어
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
