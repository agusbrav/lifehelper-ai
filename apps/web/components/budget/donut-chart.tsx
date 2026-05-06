'use client'

const R = 15.9155
const CIRC = 2 * Math.PI * R  // ≈ 100

export type DonutSegment = {
  category: string | null
  value: number
  color: string
}

type Props = {
  segments: DonutSegment[]
  total: number
  centerLabel: string
  onToggle: (categoryKey: string) => void
}

export function DonutChart({ segments, total, centerLabel, onToggle }: Props) {
  // Build segments with cumulative offsets.
  // transform="rotate(-90 21 21)" moves the circle's path start from 3 o'clock
  // to 12 o'clock. Each segment is then offset by -cumulativeLength so it starts
  // exactly where the previous one ended.
  let cum = 0
  const rendered = segments.map(seg => {
    const pct = total > 0 ? (seg.value / total) * CIRC : 0
    const entry = { key: seg.category ?? '__null__', pct, offset: -cum, color: seg.color }
    cum += pct
    return entry
  })

  return (
    <svg viewBox="0 0 42 42" width="160" height="160" aria-hidden="true">
      {/* Background ring */}
      <circle
        cx="21" cy="21" r={R}
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
      />
      {/* Segments */}
      {rendered.map(s => (
        <circle
          key={s.key}
          cx="21" cy="21" r={R}
          fill="none"
          stroke={s.color}
          strokeWidth="3"
          strokeDasharray={`${s.pct} ${CIRC - s.pct}`}
          strokeDashoffset={s.offset}
          transform="rotate(-90 21 21)"
          onClick={() => onToggle(s.key)}
          style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
        />
      ))}
      {/* Center label */}
      <text
        x="21" y="19.5"
        textAnchor="middle"
        fontSize="4"
        fontWeight="600"
        fill="var(--fg)"
      >
        {centerLabel}
      </text>
      <text
        x="21" y="24"
        textAnchor="middle"
        fontSize="3"
        fill="var(--muted-fg)"
      >
        total
      </text>
    </svg>
  )
}
