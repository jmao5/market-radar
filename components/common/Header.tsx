import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  left?: ReactNode
  right?: ReactNode
  className?: string
  borderless?: boolean
}

export default function Header({ title, left, right, className, borderless }: HeaderProps) {
  return (
    <header
      className={cn('flex h-12 items-center px-4 gap-2', className)}
      style={!borderless ? { borderBottom: '1px solid var(--border-subtle)' } : undefined}
    >
      {left && <div className="flex items-center">{left}</div>}
      {title && (
        <h1 className="flex-1 text-text-main text-base font-semibold truncate">
          {title}
        </h1>
      )}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </header>
  )
}
