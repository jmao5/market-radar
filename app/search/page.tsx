import { Suspense } from 'react'
import SearchClient from './SearchClient'
import Loading from '@/components/ui/Loading'

export const metadata = { title: '검색' }

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchClient />
    </Suspense>
  )
}
