'use client'

import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface EmptyStateProps {
  /** SVG 아이콘 또는 이미지 등 */
  icon?: ReactNode
  /** 주 메시지 */
  title: string
  /** 보조 설명 */
  description?: string
  /** CTA 버튼 */
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * EmptyState — 빈 목록·검색 결과 없음 등에서 공통으로 사용하는 UI
 *
 * 사용 예)
 *   <EmptyState
 *     icon={<BiSearch size={40} />}
 *     title="검색 결과가 없어요"
 *     description="다른 키워드로 검색해 보세요"
 *   />
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 py-16 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
          {icon}
        </div>
      )}
      <p className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>
        {title}
      </p>
      {description && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-full px-5 py-2 text-sm font-semibold btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
