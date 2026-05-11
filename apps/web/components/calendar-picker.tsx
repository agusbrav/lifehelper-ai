'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'

type Props = {
  anchorEl: HTMLElement | null
  value: Date | null
  onChange: (date: Date) => void
  onClear?: () => void
  onClose: () => void
}

const cls = {
  root:             'text-[var(--fg)]',
  months:           'flex',
  month:            'w-full',
  month_caption:    'flex items-center justify-center py-1 mb-1 relative',
  caption_label:    'text-xs font-medium text-[var(--fg)] capitalize',
  nav:              'absolute inset-x-0 top-0 flex justify-between items-center',
  button_previous:  'w-6 h-6 flex items-center justify-center rounded text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-colors text-base leading-none',
  button_next:      'w-6 h-6 flex items-center justify-center rounded text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-colors text-base leading-none',
  month_grid:       'w-full border-collapse',
  weekdays:         '',
  weekday:          'text-center text-[10px] text-[var(--muted-fg)] font-medium pb-1 w-7',
  week:             '',
  day:              'p-0',
  day_button:       'w-7 h-7 text-[11px] rounded transition-colors text-center flex items-center justify-center mx-auto hover:bg-[var(--muted)] text-[var(--fg)]',
  selected:         'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold hover:bg-[var(--accent)] rounded',
  today:            'text-[var(--accent)] font-semibold',
  outside:          'text-[var(--muted-fg)] opacity-40',
  disabled:         'opacity-30 cursor-not-allowed',
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
