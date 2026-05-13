import type { MarketIndex } from '@/types/market'

export function MarketIndexCard({ index }: { index: MarketIndex }) {
  const direction = index.change_pct > 0 ? 'up' : index.change_pct < 0 ? 'down' : 'flat'
  const colorClass =
    direction === 'up'
      ? 'text-red-500'
      : direction === 'down'
        ? 'text-blue-500'
        : 'text-[var(--text-muted)]'

  return (
    <div className="app-card flex flex-col gap-1 px-4 py-3 min-w-[104px]">
      <span className="text-[11px] font-medium text-[var(--text-muted)]">
        {index.symbol}
      </span>
      <span className="text-[16px] font-bold text-[var(--text-main)] tracking-tight">
        {index.price.toLocaleString()}
      </span>
      <span className={`text-[12px] font-semibold ${colorClass}`}>
        {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'}{' '}
        {Math.abs(index.change_pct).toFixed(2)}%
      </span>
    </div>
  )
}

export function MarketIndexSkeleton() {
  return (
    <div className="app-card flex flex-col gap-2 px-4 py-3 min-w-[104px]">
      <div className="skeleton-shimmer h-3 w-10 rounded-md" />
      <div className="skeleton-shimmer h-5 w-16 rounded-md" />
      <div className="skeleton-shimmer h-3 w-12 rounded-md" />
    </div>
  )
}
