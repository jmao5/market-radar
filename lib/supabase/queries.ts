/**
 * lib/supabase/queries.ts
 *
 * 공통 Supabase 쿼리 함수 모음.
 * TanStack Query와 조합 예시:
 *
 *   const { data } = useQuery({
 *     queryKey: ['profile', userId],
 *     queryFn: () => getProfile(userId),
 *   })
 */
import { createClient } from './client'

// ── 프로필 ──────────────────────────────────────────────────

/**
 * 단일 유저 프로필 조회
 * @param userId  auth.users.id
 */
export async function getProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * 프로필 업서트 (없으면 생성, 있으면 업데이트)
 */
export async function upsertProfile(
  userId: string,
  payload: Record<string, unknown>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Supabase Storage ────────────────────────────────────────

/**
 * Storage 파일 업로드 후 공개 URL 반환
 * @param bucket  스토리지 버킷명
 * @param path    저장 경로 (예: `avatars/userId.jpg`)
 * @param file    업로드할 File 객체
 */
export async function uploadFile(bucket: string, path: string, file: File) {
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// ── 페이지네이션 헬퍼 ────────────────────────────────────────

/**
 * cursor 기반 페이지네이션 헬퍼
 *
 * 사용 예)
 *   const { data, nextCursor } = await paginatedQuery('items', {
 *     select: 'id, title, created_at',
 *     orderBy: 'created_at',
 *     cursor: lastCreatedAt,
 *     limit: 20,
 *   })
 */
export async function paginatedQuery<T>(
  table: string,
  options: {
    select?: string
    orderBy?: string
    ascending?: boolean
    cursor?: string | number | null
    limit?: number
    filters?: Record<string, unknown>
  }
): Promise<{ data: T[]; nextCursor: string | null }> {
  const {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    cursor,
    limit = 20,
    filters = {},
  } = options

  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from(table) as any).select(select).order(orderBy, { ascending }).limit(limit + 1)

  if (cursor) {
    query = ascending
      ? query.gt(orderBy, cursor)
      : query.lt(orderBy, cursor)
  }

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query
  if (error) throw error

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? items[items.length - 1][orderBy] : null

  return { data: items as T[], nextCursor }
}
