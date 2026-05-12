import type { BaseEntity } from './common'

export interface UserProfile extends BaseEntity {
  email: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  is_active: boolean
}
