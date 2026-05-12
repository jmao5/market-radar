import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p className="text-6xl font-bold" style={{ color: 'var(--point-color)' }}>404</p>
      <p className="text-text-main text-lg font-bold">페이지를 찾을 수 없습니다</p>
      <Link
        href="/"
        className="btn-primary rounded-full px-6 py-2 text-sm font-semibold"
      >
        홈으로
      </Link>
    </div>
  )
}
