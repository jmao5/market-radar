/**
 * app/posts/[id]/page.tsx
 *
 * 게시글 상세 페이지 (Server Component)
 * - getForumPostDetail + getForumComments prefetch
 * - body_text가 null이면 (아직 상세 스크래핑 전) 원본 링크로 fallback
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import getQueryClient from '@/lib/getQueryClient'
import {
  getForumPostDetail,
  getForumComments,
  marketQueryKeys,
} from '@/lib/supabase/marketQueries'
import PostDetailClient from './PostDetailClient'
import Loading from '@/components/ui/Loading'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const post = await getForumPostDetail(id)
    return { title: post.title }
  } catch {
    return { title: '게시글' }
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params

  // 존재 여부 확인
  let post
  try {
    post = await getForumPostDetail(id)
  } catch {
    notFound()
  }

  // TanStack Query prefetch
  const queryClient = getQueryClient()
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: marketQueryKeys.forumPostDetail(id),
      queryFn: () => post,
    }),
    queryClient.prefetchQuery({
      queryKey: marketQueryKeys.forumComments(id),
      queryFn: () => getForumComments(id),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading />}>
        <PostDetailClient id={id} originalUrl={post.url} />
      </Suspense>
    </HydrationBoundary>
  )
}
