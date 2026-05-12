import { Suspense } from 'react'
import HomeClient from './HomeClient'
import Loading from '@/components/ui/Loading'

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeClient />
    </Suspense>
  )
}
