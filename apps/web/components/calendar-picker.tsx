'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import type { DayButtonProps } from 'react-day-picker'

type Props = {
  anchorEl: HTMLElement | null
  value: Date | null
  onChange: (date: Date) => void
  onClear?: () => void
  onClose: () => void
}

function Chevron({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {orientation === 'left'
        ? <polyline points="15 18 9 12 15 6" />
        : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}

function DayButton({ day, modifiers, ...props }: DayButtonProps) {
  const cls = [
    'w-7 h-7 text-[11px] rounded transition-colors flex items-center justify-center mx-auto',
    modifiers.selected
      ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold hover:opacity-90'
      : modifiers.today
        ? 'text-[var(--accent)] font-semibold ring-1 ring-[var(--accent)]/50 hover:bg-[var(--accent-muted)]'
        : modifiers.outside
          ? 'text-[var(--muted-fg)] opacity-30 hover:bg-[var(--muted)]'
          : 'text-[var(--fg)] hover:bg-[var(--muted)]',
    modifiers.disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
  ].filter(Boolean).join(' ')

  return <button {...props} className={cls} />
}

const cls = {
  root: '',
  months: 'relative',
  month: 'w-full',
  month_caption: 'flex items-center justify-center h-7 mb-2',
  caption_label: 'text-xs font-medium text-[var(--fg)] capitalize',
  nav: 'absolute inset-x-0 top-0 h-7 flex items-center justify-between',
  button_previous: 'w-7 h-7 flex items-center justify-center rounded text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-colors',
  button_next: 'w-7 h-7 flex items-center justify-center rounded text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-colors',
  month_grid: 'w-full border-collapse',
  weekdays: '',
  weekday: 'text-center text-[10px] text-[var(--muted-fg)] font-medium pb-1 w-7',
  week: '',
  day: 'p-0',
  day_button: '',
}

export function CalendarPicker({ anchorEl, value, onChange, onClear, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !anchorEl?.contains(target)) onClose()
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [anchorEl, onClose])

  if (!anchorEl) return null

  const rect = anchorEl.getBoundingClientRect()

  const panel = (
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl p-3 w-56 select-none"
    >
      <DayPicker
        mode="single"
        selected={value ?? undefined}
        defaultMonth={value ?? undefined}
        onSelect={date => { if (date) { onChange(date); onClose() } }}
        weekStartsOn={1}
        classNames={cls}
        components={{ Chevron, DayButton }}
      />
      {onClear && value && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] text-center">
          <button
            type="button"
            onClick={() => { onClear(); onClose() }}
            className="text-[11px] text-[var(--muted-fg)] hover:text-rose-400 transition-colors"
          >
            Clear date
          </button>
        </div>
      )}
    </div>
  )

  return createPortal(panel, document.body)
}
