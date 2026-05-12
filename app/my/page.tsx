import { Suspense } from 'react'
import MyPageClient from './MyPageClient'
import Loading from '@/components/ui/Loading'

export const metadata = { title: '마이페이지' }

export default function MyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MyPageClient />
    </Suspense>
  )
}
