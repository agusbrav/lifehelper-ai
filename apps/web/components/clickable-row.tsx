type Props = {
  onClick: () => void
  excluded?: boolean
  children: React.ReactNode
  className?: string
}

export function ClickableRow({ onClick, excluded = false, children, className = '' }: Props) {
  return (
    <tr
      onClick={onClick}
      className={`border-t border-[var(--border)] cursor-pointer transition-colors ${
        excluded ? 'opacity-40' : 'hover:bg-[var(--accent-muted)]'
      } ${className}`}
    >
      {children}
    </tr>
  )
}
