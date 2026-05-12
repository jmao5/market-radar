// src/lib/getQueryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'

// cache()를 사용하면 한 번의 요청(Request) 동안은 동일한 Client를 재사용합니다.
const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // 서버 사이드 페칭 시에는 재시도 하지 않음 (빠른 실패)
          retry: false,
          staleTime: 60 * 1000,
        },
      },
    }),
)

export default getQueryClient
