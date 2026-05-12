'use client'

import * as React from 'react'
import { Select } from '@base-ui-components/react'
import { clsx } from 'clsx'
import { BiChevronDown, BiCheck } from 'react-icons/bi'

export interface SelectItem {
  value: string
  label: string
}

export interface AppSelectProps {
  value: string
  onValueChange: (value: string) => void
  items: SelectItem[]
  placeholder?: string
  className?: string
}

export function AppSelect({
  value,
  onValueChange,
  items,
  placeholder = '선택하세요',
  className,
}: AppSelectProps) {
  return (
    <Select.Root value={value} onValueChange={(val) => val && onValueChange(val)}>
      <Select.Trigger
        className={clsx(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border-main bg-bg-sub px-4 py-2 text-sm font-bold text-text-main transition-all hover:bg-bg-main focus:outline-none focus:ring-2 focus:ring-point/50 active:scale-95',
          className,
        )}
      >
        <Select.Value>
          {items.find((item) => item.value === value)?.label || placeholder}
        </Select.Value>
        <BiChevronDown className="h-4 w-4 text-text-sub transition-transform data-[open]:rotate-180" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner sideOffset={8}>
          <Select.Popup
            className={clsx(
              'z-[100] min-w-[var(--select-trigger-width)] overflow-hidden rounded-2xl border border-white/10 bg-white p-1 text-gray-900 shadow-2xl backdrop-blur-xl dark:bg-gray-950 dark:text-gray-100',
              'data-[entering]:opacity-100 data-[entering]:scale-100 data-[exiting]:opacity-0 data-[exiting]:scale-95 duration-200 transition-all',
            )}
          >
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className={clsx(
                  'flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors dark:text-gray-200',
                  'data-[highlighted]:bg-point data-[highlighted]:text-white data-[selected]:text-point data-[selected]:font-bold',
                )}
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <BiCheck size={18} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

/** @deprecated JmanaSelect → AppSelect로 이름이 변경되었습니다. */
export const JmanaSelect = AppSelect
