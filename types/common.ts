/** 공통 API 응답 래퍼 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

/** 페이지네이션 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

/** 필터/정렬 공통 */
export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
}

/** 좌표 */
export interface LatLng {
  lat: number
  lng: number
}

/** 이미지 */
export interface ImageMeta {
  url: string
  width?: number
  height?: number
  alt?: string
}

/** 공통 엔티티 베이스 */
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}
