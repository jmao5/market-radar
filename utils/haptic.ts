/**
 * 모바일 햅틱 피드백 (진동) 유틸리티
 */
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10)
        break
      case 'medium':
        window.navigator.vibrate(20)
        break
      case 'heavy':
        window.navigator.vibrate([30, 50, 30])
        break
    }
  }
}
