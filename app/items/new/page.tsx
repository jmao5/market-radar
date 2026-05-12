'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BiArrowBack } from 'react-icons/bi'
import { useAuth } from '@/hooks/useAuth'
import Loading from '@/components/ui/Loading'

/**
 * /items/new — 아이템 생성 페이지
 *
 * TODO: 실제 프로젝트에 맞게 폼 필드와 제출 로직을 구현하세요.
 * 현재는 기본 구조(헤더·폼 영역·제출 버튼)만 제공합니다.
 */
export default function NewItemPage() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 비로그인 접근 시 — middleware에서 차단되지만 클라이언트 방어도 추가
  if (!isLoggedIn) {
    router.replace('/login?next=/items/new')
    return <Loading />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // TODO: Supabase insert 또는 API 호출
      // const formData = new FormData(e.currentTarget)
      // await createItem({ title: formData.get('title') as string })
      router.push('/')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 헤더 */}
      <header
        className="flex h-12 items-center gap-2 px-4"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-full p-1 active:opacity-50"
          aria-label="뒤로가기"
        >
          <BiArrowBack size={22} style={{ color: 'var(--text-main)' }} />
        </button>
        <h1 className="flex-1 text-base font-semibold" style={{ color: 'var(--text-main)' }}>
          새로 만들기
        </h1>
        <button
          type="submit"
          form="new-item-form"
          disabled={isSubmitting}
          className="rounded-full px-4 py-1.5 text-sm font-semibold btn-primary disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </header>

      {/* 폼 */}
      <form
        id="new-item-form"
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-hide p-4"
      >
        {/* TODO: 프로젝트에 맞는 필드로 교체 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>
            제목 <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="제목을 입력하세요"
            className="selectable rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
            style={{
              background: 'var(--bg-sub)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>
            내용
          </label>
          <textarea
            name="description"
            rows={5}
            placeholder="내용을 입력하세요"
            className="selectable resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
            style={{
              background: 'var(--bg-sub)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          />
        </div>
      </form>

      {isSubmitting && <Loading fullScreen={false} className="py-4" />}
    </div>
  )
}
