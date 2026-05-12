'use client'

import * as React from 'react'
import { Slider } from '@base-ui-components/react'
import { clsx } from 'clsx'

export interface AppSliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label?: string
  icon?: React.ReactNode
}

export function AppSlider({ value, min, max, step = 1, onChange, label, icon }: AppSliderProps) {
  // Base UI Slider는 controlled value를 배열로 받음
  const sliderValue = React.useMemo(() => [value], [value])
  const id = React.useId()

  return (
    <div className="flex flex-col gap-2 py-2">
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {icon}
          <span>{label}</span>
          <span className="ml-auto font-extrabold" style={{ color: 'var(--point-color)' }}>
            {value}
          </span>
        </label>
      )}
      <Slider.Root
        id={id}
        value={sliderValue}
        min={min}
        max={max}
        step={step}
        onValueChange={(val) => {
          const next = Array.isArray(val) ? val[0] : val
          onChange(next)
        }}
        // 부모 onClick(토글 등) 버블링 차단
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
        className="relative flex w-full touch-none select-none items-center"
      >
        <Slider.Control className="relative flex h-10 w-full cursor-pointer items-center">
          <Slider.Track
            className="relative h-2 w-full grow overflow-hidden rounded-full"
            style={{ background: 'var(--border-main)' }}
          >
            <Slider.Indicator
              className="absolute h-full transition-colors"
              style={{ background: 'var(--point-color)' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className={clsx(
              'z-10 block h-5 w-5 rounded-full border-2 bg-white shadow-lg transition-all',
              'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'active:scale-95',
            )}
            style={
              {
                borderColor: 'var(--point-color)',
                '--tw-ring-color': 'var(--point-color)',
              } as React.CSSProperties
            }
          />
        </Slider.Control>
      </Slider.Root>
    </div>
  )
}

/** @deprecated JmanaSlider → AppSlider로 이름이 변경되었습니다. */
export const JmanaSlider = AppSlider
