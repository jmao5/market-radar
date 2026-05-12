'use client'

import * as React from 'react'
import { Switch } from '@base-ui-components/react'
import { clsx } from 'clsx'

export interface AppSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function AppSwitch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: AppSwitchProps) {
  const id = React.useId()

  return (
    <div className={clsx('flex items-center justify-between gap-4 py-2', className)}>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-bold"
              style={{ color: 'var(--text-main)' }}
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {description}
            </span>
          )}
        </div>
      )}
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className={clsx(
          'relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-30',
          checked ? 'bg-point' : 'bg-border-strong',
        )}
      >
        <Switch.Thumb
          className={clsx(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </Switch.Root>
    </div>
  )
}

/** @deprecated JmanaSwitch → AppSwitch로 이름이 변경되었습니다. */
export const JmanaSwitch = AppSwitch
