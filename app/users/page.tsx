import { Suspense } from 'react'
import UsersClient from './UsersClient'
import Loading from '@/components/ui/Loading'

export const metadata = { title: '관심 작성자' }

export default function UsersPage() {
  return (
    <Suspense fallback={<Loading fullScreen={false} />}>
      <UsersClient />
    </Suspense>
  )
}
