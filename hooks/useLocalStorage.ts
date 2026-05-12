'use client'

import { useCallback, useSyncExternalStore } from 'react'

// 커스텀 이벤트 이름
const STORAGE_EVENT = 'local-storage-change'

export default function useLocalStorage<T>(key: string, initialValue: T) {
  // 1. [Client] 현재 데이터 가져오기 (Snapshot)
  const getSnapshot = () => {
    if (typeof window === 'undefined') return JSON.stringify(initialValue)
    try {
      return window.localStorage.getItem(key) || JSON.stringify(initialValue)
    } catch {
      return JSON.stringify(initialValue)
    }
  }

  // 2. [Server] 서버 렌더링 시 반환할 데이터 (초기값)
  const getServerSnapshot = () => JSON.stringify(initialValue)

  // 3. [구독] 데이터가 변하면 리액트에게 알림
  const subscribe = useCallback((notify: () => void) => {
    // 다른 탭에서의 변경 감지
    window.addEventListener('storage', notify)
    // 같은 탭에서의 변경 감지 (우리가 발생시킬 이벤트)
    window.addEventListener(STORAGE_EVENT, notify)

    return () => {
      window.removeEventListener('storage', notify)
      window.removeEventListener(STORAGE_EVENT, notify)
    }
  }, [])

  // 4. 훅 실행 (문자열 상태로 동기화됨)
  // 이 훅은 Hydration Mismatch를 내부적으로 알아서 처리합니다.
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // 5. JSON 파싱 (사용할 때 객체로 변환)
  const value: T = (() => {
    try {
      return JSON.parse(store)
    } catch {
      return initialValue
    }
  })()

  // 6. 값 변경 함수
  const setValue = (newValue: T | ((val: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue
      const stringified = JSON.stringify(valueToStore)

      window.localStorage.setItem(key, stringified)

      // [중요] useSyncExternalStore가 감지하도록 이벤트 강제 발생
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch (error) {
      console.error(error)
    }
  }

  // 7. 삭제 함수
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key)
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch (error) {
      console.error(error)
    }
  }

  return { value, setValue, removeValue }
}
