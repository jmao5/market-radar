'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'framer-motion'

interface DialogAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'primary'
}

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  actions: DialogAction[]
}

export default function Dialog({ isOpen, onClose, title, description, actions }: DialogProps) {
  // SSR-safe portal: 마운트 후에만 DOM 탐색
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalRoot(document.getElementById('app-root'))
  }, [])

  // Escape 키로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!portalRoot) return null

  const actionStyles: Record<string, React.CSSProperties> = {
    danger:  { background: '#dc2626', color: '#fff' },
    primary: { background: 'var(--point-color)', color: '#fff' },
    default: { background: 'var(--bg-sub)', color: 'var(--text-main)' },
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', zIndex: 120 }}
            onClick={onClose}
          />
          <m.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-8 top-1/2 -translate-y-1/2 rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', zIndex: 121 }}
          >
            <h2 id="dialog-title" className="text-base font-bold mb-2" style={{ color: 'var(--text-main)' }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-sub)' }}>
                {description}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="rounded-xl py-3 text-sm font-semibold"
                  style={actionStyles[action.variant ?? 'default']}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    portalRoot
  )
}
