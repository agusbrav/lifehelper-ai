export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm px-8 py-10">
          {children}
        </div>
      </div>
    </div>
  )
}
