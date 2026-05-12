# Next.js Boilerplate

> **Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Zustand · TanStack Query**
>
> 모바일 웹앱(PWA) 표준 보일러플레이트. 인증·상태관리·라우팅·UI 시스템이 모두 연결된 상태로 시작합니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [폴더 구조](#2-폴더-구조)
3. [아키텍처 흐름](#3-아키텍처-흐름)
4. [빠른 시작](#4-빠른-시작)
5. [핵심 기능 상세](#5-핵심-기능-상세)
   - [인증 (Supabase OAuth)](#51-인증-supabase-oauth)
   - [상태 관리 (Zustand)](#52-상태-관리-zustand)
   - [서버 데이터 (TanStack Query)](#53-서버-데이터-tanstack-query)
   - [라우트 보호 (Middleware)](#54-라우트-보호-middleware)
   - [테마 (다크모드)](#55-테마-다크모드)
   - [레이아웃 시스템](#56-레이아웃-시스템)
6. [UI 컴포넌트 카탈로그](#6-ui-컴포넌트-카탈로그)
7. [Hooks 카탈로그](#7-hooks-카탈로그)
8. [유틸리티](#8-유틸리티)
9. [PWA 설정](#9-pwa-설정)
10. [새 기능 추가 가이드](#10-새-기능-추가-가이드)
11. [커스터마이징 체크리스트](#11-커스터마이징-체크리스트)
12. [알려진 이슈 및 결정 사항](#12-알려진-이슈-및-결정-사항)

---

## 1. 기술 스택

| 영역 | 라이브러리 | 버전 | 역할 |
|------|-----------|------|------|
| 프레임워크 | Next.js | 16.2 | App Router, Turbopack |
| UI | React | 19.2 | Server/Client Components |
| 언어 | TypeScript | 5.x | strict mode |
| 스타일 | Tailwind CSS | 4.x | CSS-first config (`@theme`) |
| 인증 | Supabase SSR | 0.10 | PKCE OAuth, 쿠키 세션 |
| 서버 상태 | TanStack Query | 5.x | staleTime 5분, gcTime 10분 |
| 클라이언트 상태 | Zustand | 5.x | persist 미들웨어 |
| 애니메이션 | Framer Motion | 12.x | LazyMotion(domAnimation) |
| 폼 컴포넌트 | Base UI | rc.0 | AppSelect, AppSwitch, AppSlider |
| 토스트 | react-hot-toast | 2.x | 전역 알림 |
| 날짜 | dayjs | 1.x | logger 타임스탬프 |
| 이미지 압축 | browser-image-compression | 2.x | 업로드 전처리 |

---

## 2. 폴더 구조

```
nextjs-boilerplate/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃 (폰트·Provider·Toaster)
│   ├── globals.css               # Tailwind v4 @theme + CSS 변수 디자인 토큰
│   ├── page.tsx                  # 홈 (/)
│   ├── error.tsx                 # 라우트 에러 바운더리
│   ├── not-found.tsx             # 404
│   │
│   ├── login/page.tsx            # 소셜 로그인 (Kakao · Google) + 로딩 상태
│   ├── onboarding/page.tsx       # 온보딩 (커스텀 필요)
│   ├── search/                   # 검색 페이지
│   ├── my/                       # 마이페이지 (프로필·즐겨찾기·기록·설정)
│   ├── items/new/page.tsx        # 아이템 생성 (기본 폼 구조 제공)
│   ├── users/                    # 유저 프로필 페이지 (구현 예정)
│   ├── offline/page.tsx          # PWA 오프라인 폴백
│   │
│   └── api/
│       └── auth/
│           ├── callback/route.ts # PKCE 코드 교환 → 세션 발급
│           └── logout/route.ts   # 서버사이드 로그아웃
│
├── components/
│   ├── layout/
│   │   └── AppFrame.tsx          # 모바일 컨테이너 (max-w-md, safe-area)
│   ├── common/
│   │   ├── Header.tsx            # 페이지 헤더 (left·title·right 슬롯)
│   │   ├── PageTransition.tsx    # 페이지 전환 애니메이션
│   │   ├── AsyncBoundary.tsx     # Suspense + ErrorBoundary 통합
│   │   └── AsyncBoundaryWrapper.tsx  # AsyncBoundary 편의 래퍼
│   ├── providers/
│   │   ├── AuthProvider.tsx      # 세션 초기화 + onAuthStateChange 구독
│   │   ├── ThemeProvider.tsx     # 다크모드 클래스 적용
│   │   ├── QueryProvider.tsx     # TanStack Query 클라이언트
│   │   └── MotionProvider.tsx    # LazyMotion(domAnimation)
│   ├── ui/                       # → 6번 섹션 참고
│   ├── Navbar.tsx                # 하단 탭 네비게이션
│   └── ClientLayout.tsx          # Navbar 표시 여부 제어
│
├── stores/
│   ├── userStore.ts              # 세션·유저·role (role만 persist)
│   ├── uiStore.ts                # theme persist ('ui-storage')
│   └── filterStore.ts            # 검색 쿼리·정렬·태그 (비persist)
│
├── hooks/
│   ├── useAuth.ts                # isLoggedIn·isAdmin 파생 상태
│   ├── useDebounce.ts            # 입력 디바운스
│   ├── useIntersectionObserver.ts # 무한스크롤 트리거
│   ├── useIsMobile.ts            # UA 기반 모바일 감지
│   ├── useLocalStorage.ts        # SSR-safe useSyncExternalStore 래퍼
│   └── useStatusBar.ts           # 모바일 상태바 색상 동적 변경
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient 싱글톤
│   │   ├── server.ts             # createServerClient (cookies)
│   │   └── queries.ts            # 공통 쿼리 (getProfile·upload·paginatedQuery)
│   ├── utils.ts                  # cn·formatDate·timeAgo·formatCount·slugify·getStorageUrl
│   ├── logger.ts                 # info·warn·error·debug (dev only)
│   └── getQueryClient.ts         # 서버사이드 QueryClient (React cache())
│
├── types/
│   ├── common.ts                 # ApiResponse·PaginatedResponse·BaseEntity 등
│   └── user.ts                   # UserProfile 인터페이스
│
├── utils/
│   └── haptic.ts                 # 진동 피드백 (light·medium·heavy)
│
├── public/
│   ├── manifest.json             # PWA 매니페스트
│   ├── sw.js                     # Service Worker (캐시·오프라인)
│   ├── favicon.svg               # 파비콘 placeholder (교체 필요 → 아래 참고)
│   ├── lottie/waiting.json       # 로딩 애니메이션
│   └── icons/
│       ├── icon-192x192.svg      # PWA 아이콘 placeholder
│       ├── icon-512x512.svg      # PWA 아이콘 placeholder (maskable)
│       └── apple-touch-icon.svg  # iOS 홈화면 아이콘 placeholder
│
├── proxy.ts                      # Middleware (라우트 보호)
├── next.config.ts                # Turbopack, Bundle Analyzer
├── postcss.config.mjs
├── tsconfig.json                 # strict, paths(@/*)
└── .env.example
```

---

## 3. 아키텍처 흐름

```
요청
 │
 ▼
proxy.ts (Middleware)
 ├─ 비로그인 + 보호 경로 → /login?next=...  리다이렉트
 └─ 로그인 + /login     → /  리다이렉트
         │
         ▼
app/layout.tsx  (Server Component)
 ├─ Supabase 서버 클라이언트로 세션 조회
 └─ <AuthProvider session={session}>   ← 초기 세션 SSR 주입
         │
         ▼
AuthProvider.tsx  (Client Component)
 ├─ useEffect → userStore 초기화
 └─ onAuthStateChange 구독 → 세션 변경 시 store 업데이트
         │
         ▼
AppFrame  →  ClientLayout  →  page.tsx
                │
                ├─ Navbar (하단 탭)
                └─ <Suspense>  →  *Client.tsx
                                    └─ useAuth() / useUserStore()
                                       useQuery() / useMutation()
```

**데이터 패턴: Server Component + TanStack Query HydrationBoundary**

```
page.tsx (Server)                    *Client.tsx (Client)
  └─ getQueryClient()                  └─ useQuery({ queryKey, queryFn })
  └─ queryClient.prefetchQuery()            ↑ 이미 캐시됨 → 즉시 렌더
  └─ <HydrationBoundary state={dehydrate}>
```

---

## 4. 빠른 시작

### 전제 조건

- Node.js 20+
- pnpm 9+
- Supabase 프로젝트 (Authentication → Providers에서 Kakao/Google 활성화)

### 설치

```bash
git clone <repo-url>
cd nextjs-boilerplate
pnpm install
```

### 환경변수 설정

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=My App
```

### 개발 서버 실행

```bash
pnpm dev      # Turbopack 사용
pnpm build    # 프로덕션 빌드
pnpm start    # 프로덕션 서버
```

### 번들 분석

```bash
ANALYZE=true pnpm build
```

---

## 5. 핵심 기능 상세

### 5.1 인증 (Supabase OAuth)

**흐름:**

```
/login 버튼 클릭
  → supabase.auth.signInWithOAuth({ provider, redirectTo })
  → Supabase OAuth 서버
  → /api/auth/callback?code=...
  → exchangeCodeForSession(code)  ← PKCE
  → 세션 쿠키 발급
  → / 리다이렉트
```

**로그인 페이지 특징:**

- 버튼 클릭 시 `loadingProvider` 상태로 즉시 스피너 표시
- 진행 중 다른 버튼 클릭 차단 (`disabled` 처리)
- 리다이렉트가 시작되면 `finally`에서 상태 자동 초기화

**로그아웃:**

```ts
// 클라이언트 직접 (즉시)
await createClient().auth.signOut()

// 서버 라우트 경유 (POST /api/auth/logout)
// 서버에서 쿠키까지 완전 삭제 보장
```

**역할(Role) 관리:**

```ts
// Supabase Dashboard → Authentication → Users → app_metadata
{ "role": "admin" }

// 코드에서 접근
const { isAdmin } = useAuth()
```

---

### 5.2 상태 관리 (Zustand)

| 스토어 | persist | 저장 내용 |
|--------|---------|----------|
| `userStore` | ✅ (role만) | session, user, role, isLoading |
| `uiStore` | ✅ (theme) | theme ('ui-storage' key) |
| `filterStore` | ❌ | query, sortOrder, selectedTags |

```ts
// 사용 예시
const { isLoggedIn, isAdmin, user } = useAuth()     // 파생 상태 훅
const { theme, toggleTheme } = useUiStore()
const { query, setQuery, resetFilters } = useFilterStore()
```

> **보안 주의:** 세션 토큰은 persist에서 제외됩니다. role만 localStorage에 저장되며, 실제 권한 검증은 항상 서버(Supabase RLS)에서 수행해야 합니다.

---

### 5.3 서버 데이터 (TanStack Query)

**클라이언트 기본 설정 (QueryProvider):**

```
staleTime:           5분  (재요청 없이 캐시 사용)
gcTime:             10분  (미사용 캐시 보관)
retry:               1회
refetchOnWindowFocus: 끔
```

**서버 컴포넌트에서 prefetch:**

```ts
// app/some/page.tsx (Server Component)
import getQueryClient from '@/lib/getQueryClient'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export default async function Page() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemsClient />
    </HydrationBoundary>
  )
}
```

**무한스크롤 패턴:**

```ts
const ref = useIntersectionObserver({
  onObserve: fetchNextPage,
  enabled: hasNextPage,
})

return <div ref={ref} />  // 뷰포트 진입 시 자동 트리거
```

---

### 5.4 라우트 보호 (Middleware)

`proxy.ts` → `middleware.ts` 또는 Next.js `matcher`로 연결됩니다.

```ts
// 공개 경로 (로그인 없이 접근 가능)
const PUBLIC_PATHS    = ['/', '/login']
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon', '/icons', '/images', '/manifest']
```

> 보호가 필요한 경로는 위 목록에서 제외하기만 하면 됩니다.  
> `/items/new`, `/my/*` 등은 자동으로 보호됩니다.

---

### 5.5 테마 (다크모드)

**플리커 없는 다크모드 구현 방식:**

```
1. layout.tsx <head> 인라인 스크립트
   → localStorage('ui-storage') 읽어서 즉시 html.classList.add('dark')

2. ThemeProvider (useEffect)
   → theme 상태 변경 시 classList 동기화

3. globals.css
   → :root { --bg-main: #fff ... }
   → .dark { --bg-main: #0a0a0a ... }
```

```ts
// 토글
const { toggleTheme } = useUiStore()
<ThemeToggle />  // 컴포넌트도 제공
```

---

### 5.6 레이아웃 시스템

```
<html>
  <body>
    <AppFrame>                  ← 모바일 컨테이너 (max-w-md, safe-area)
      <div id="app-root">       ← Portal 마운트 대상 (BottomSheet, Dialog)
        <AuthProvider>
          <ClientLayout>        ← Navbar 표시 제어
            <main>
              {page}            ← 각 라우트 콘텐츠
            </main>
            <Navbar />          ← 하단 탭 (login·onboarding에서 숨김)
          </ClientLayout>
        </AuthProvider>
      </div>
    </AppFrame>
  </body>
</html>
```

**Navbar 숨김 경로 추가:**

```ts
// components/ClientLayout.tsx
const HIDE_NAVBAR_PATHS = ['/login', '/onboarding', '/your-new-path']
```

---

## 6. UI 컴포넌트 카탈로그

### Loading

```tsx
<Loading />                          // 기본 (spinner, fullScreen)
<Loading variant="dots" />           // 점 3개 바운스
<Loading variant="lottie" />         // public/lottie/waiting.json 사용
                                     // (파일 없으면 spinner 폴백)
<Loading variant="image" imageSrc="/logo.png" />
<Loading fullScreen={false} message="데이터를 불러오는 중..." />
```

### Skeleton

```tsx
<Skeleton className="h-4 w-32" />        // shimmer 애니메이션
<Skeleton className="h-48 w-full" />     // 카드 이미지 자리
```

### SmartImage

```tsx
// 로딩 스켈레톤 + 에러 폴백 자동 처리
<SmartImage src={url} alt="설명" className="object-cover" fill />
<SmartImage src={null} />  // → NO IMAGE 폴백 표시
```

### BottomSheet

```tsx
const [open, setOpen] = useState(false)
<BottomSheet isOpen={open} onClose={() => setOpen(false)} title="옵션">
  <div>컨텐츠</div>
</BottomSheet>
// Escape 키 닫기 지원, SSR-safe portal (#app-root)
```

### Dialog

```tsx
<Dialog
  isOpen={open}
  onClose={() => setOpen(false)}
  title="삭제하시겠습니까?"
  description="이 작업은 되돌릴 수 없습니다."
  actions={[
    { label: '취소',   onClick: () => setOpen(false) },
    { label: '삭제',   onClick: handleDelete, variant: 'danger' },
  ]}
/>
// variant: 'default' | 'danger' | 'primary'
// Escape 키 닫기 지원
```

### EmptyState

```tsx
<EmptyState
  icon={<BiSearch size={40} />}
  title="검색 결과가 없어요"
  description="다른 키워드로 검색해 보세요"
  action={{ label: '초기화', onClick: resetFilters }}
/>
```

### ErrorBoundary

```tsx
// 기본 폴백 (다시 시도 버튼)
<ErrorBoundary>
  <SomeComponent />
</ErrorBoundary>

// 커스텀 폴백
<ErrorBoundary fallback={(error, reset) => (
  <button onClick={reset}>재시도: {error.message}</button>
)}>
  <SomeComponent />
</ErrorBoundary>
```

### AsyncBoundaryWrapper

```tsx
// Suspense + ErrorBoundary + QueryErrorResetBoundary 통합
<AsyncBoundaryWrapper>
  <ComponentThatUsesUseQuery />
</AsyncBoundaryWrapper>

<AsyncBoundaryWrapper loadingFallback={<Skeleton className="h-48" />}>
  <HeavyComponent />
</AsyncBoundaryWrapper>
```

### Header

```tsx
<Header
  title="페이지 제목"
  left={<button onClick={router.back}>←</button>}
  right={<button>편집</button>}
/>
<Header title="테두리 없음" borderless />
```

### FloatingActions

```tsx
// AppFrame 내 자동 배치 (홈에서만 + 버튼, 스크롤 시 맨위로 버튼)
<FloatingActions />
```

### Form 컴포넌트 (Base UI)

```tsx
// ✅ 새 이름 (권장)
import { AppSelect } from '@/components/ui/Select'
import { AppSwitch } from '@/components/ui/Switch'
import { AppSlider } from '@/components/ui/Slider'

<AppSelect
  value={sort}
  onValueChange={setSort}
  items={[{ value: 'latest', label: '최신순' }, { value: 'popular', label: '인기순' }]}
/>

<AppSwitch
  checked={enabled}
  onCheckedChange={setEnabled}
  label="알림"
  description="새 항목이 추가되면 알림을 받습니다"
/>

<AppSlider value={size} min={12} max={24} step={1} onChange={setSize} label="글자 크기" />
```

> `JmanaSelect` / `JmanaSwitch` / `JmanaSlider` 이름은 deprecated alias로 유지되어 기존 코드는 바로 동작하지만, 새 코드에서는 `App*` 이름을 사용하세요.

### PageTransition

```tsx
<PageTransition id={uniqueId}>
  {content}
</PageTransition>
```

---

## 7. Hooks 카탈로그

| 훅 | 반환 | 사용 케이스 |
|----|------|------------|
| `useAuth()` | `{ isLoggedIn, isAdmin, user, session, role, isLoading }` | 인증 상태 확인 |
| `useDebounce(value, delay)` | `debouncedValue` | 검색 입력 최적화 |
| `useIntersectionObserver({ onObserve })` | `ref` | 무한 스크롤 |
| `useIsMobile()` | `boolean` | UA 기반 모바일 감지 |
| `useLocalStorage(key, initial)` | `{ value, setValue, removeValue }` | SSR-safe localStorage |
| `useStatusBar()` | `void` | 모바일 상태바 색상 변경 |

```ts
// useDebounce 예시
const debouncedQuery = useDebounce(inputValue, 300)
useEffect(() => {
  if (debouncedQuery) search(debouncedQuery)
}, [debouncedQuery])

// useLocalStorage 예시 (useSyncExternalStore 기반, 탭 간 동기화)
const { value: savedItems, setValue } = useLocalStorage<string[]>('saved', [])
```

---

## 8. 유틸리티

### lib/utils.ts

```ts
cn('px-4 py-2', isActive && 'bg-blue-500')   // Tailwind 클래스 병합
formatDate('2024-01-15')                       // '1월 15일'
formatDate('2024-01-15', 'long')               // '2024년 1월 15일'
timeAgo('2024-01-15T10:00:00Z')               // '3시간 전'
formatCount(12500)                             // '12.5K'
slugify('Hello World!')                        // 'hello-world'
getStorageUrl('avatars/user.jpg')             // Supabase Storage 전체 URL
```

### lib/logger.ts

```ts
logger.info('서버 시작', { port: 3000 })
logger.warn('레이트 리밋 근접', { remaining: 5 })
logger.error('DB 연결 실패', error)
logger.debug('쿼리 실행', query)   // dev 환경에서만 출력
```

### utils/haptic.ts

```ts
hapticFeedback()           // light (10ms)
hapticFeedback('medium')   // medium (20ms)
hapticFeedback('heavy')    // heavy (30-50-30ms 패턴)
```

### lib/supabase/queries.ts

```ts
// 프로필 조회
const profile = await getProfile(userId)

// 프로필 업서트
await upsertProfile(userId, { name: '홍길동', avatar_url: '...' })

// 파일 업로드 → public URL 반환
const url = await uploadFile('avatars', `${userId}.jpg`, file)

// cursor 기반 페이지네이션
const { data, nextCursor } = await paginatedQuery<Item>('items', {
  select: 'id, title, created_at',
  orderBy: 'created_at',
  cursor: lastCursor,
  limit: 20,
  filters: { user_id: userId },
})
```

---

## 9. PWA 설정

### Service Worker (`public/sw.js`)

| 전략 | 대상 | 동작 |
|------|------|------|
| Network First | 모든 GET | 네트워크 실패 시 캐시 폴백 |
| 캐시 제외 | `/api/*`, `/_next/*` | 항상 네트워크 사용 |
| 오프라인 폴백 | 캐시 없는 요청 | `/offline` 페이지 표시 |

### 브랜드 아이콘 교체 방법

현재 `public/icons/` 안의 SVG 파일들은 임시 placeholder입니다. 실제 서비스 전 아래 절차로 교체하세요.

```
1. 브랜드 로고를 준비합니다 (1024×1024 이상 PNG/SVG 권장)

2. 다음 도구를 사용해 각 크기의 PNG를 생성합니다:
   - https://realfavicongenerator.net
   - https://maskable.app (maskable 아이콘 확인)

3. 생성된 파일을 public/icons/ 에 덮어씁니다:
   public/icons/icon-192x192.png
   public/icons/icon-512x512.png     ← maskable 용도
   public/icons/apple-touch-icon.png

4. public/manifest.json 의 type을 "image/png"로, src 확장자를 .png로 변경합니다.

5. app/layout.tsx 의 icons.apple 을 '/icons/apple-touch-icon.png' 로 변경합니다.

6. public/favicon.svg 를 favicon.ico (또는 favicon.png)로 교체하고
   app/layout.tsx 의 icons.icon 경로를 맞게 수정합니다.
```

### 매니페스트 커스터마이징

```json
// public/manifest.json
{
  "name": "My App",          ← 앱 이름 변경
  "short_name": "MyApp",
  "theme_color": "#1055d4",  ← 브랜드 포인트 컬러와 동일하게
  "icons": [...]
}
```

---

## 10. 새 기능 추가 가이드

### 새 페이지 추가

```
1. app/[route]/page.tsx 생성
2. 보호 필요 시 → PUBLIC_PATHS에 없으면 자동 보호됨
3. Navbar 필요 없으면 → HIDE_NAVBAR_PATHS에 경로 추가
```

```tsx
// 표준 페이지 패턴
export const metadata = { title: '페이지명' }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageClient />
    </Suspense>
  )
}
```

### 새 API 연동

```ts
// 1. lib/supabase/queries.ts 에 함수 추가
export async function getItems(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

// 2. 컴포넌트에서 사용
const { data } = useQuery({
  queryKey: ['items', userId],
  queryFn: () => getItems(userId),
  enabled: !!userId,
})
```

### 새 Zustand 스토어 추가

```ts
// stores/newStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NewState {
  value: string
  setValue: (v: string) => void
}

export const useNewStore = create<NewState>()(
  persist(
    (set) => ({
      value: '',
      setValue: (value) => set({ value }),
    }),
    { name: 'new-storage' }
  )
)
```

### 아이템 생성 페이지 구현 (`app/items/new/page.tsx`)

기본 골격(헤더·폼·제출 버튼·로딩 상태)이 이미 구현되어 있습니다. 아래 부분만 채우면 됩니다.

```ts
// 1. lib/supabase/queries.ts 에 createItem 함수 추가
export async function createItem(payload: { title: string; description?: string }) { ... }

// 2. app/items/new/page.tsx 의 handleSubmit 수정
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setIsSubmitting(true)
  try {
    const formData = new FormData(e.currentTarget)
    await createItem({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
    })
    toast.success('저장되었습니다')
    router.push('/')
  } catch (err) {
    toast.error('저장에 실패했습니다')
  } finally {
    setIsSubmitting(false)
  }
}
```

---

## 11. 커스터마이징 체크리스트

새 프로젝트 시작 시 반드시 수정할 항목들입니다.

### 브랜딩

- [ ] `public/manifest.json` — `name`, `short_name`, `theme_color`
- [ ] 아이콘 교체 — [9번 섹션 아이콘 교체 방법](#브랜드-아이콘-교체-방법) 참고
- [ ] `app/layout.tsx` — `metadata.title`, `description`, `openGraph` 수정
- [ ] `.env.local` — `NEXT_PUBLIC_APP_NAME` 변경

### 폰트

- [ ] Pretendard 로컬 폰트 사용 시 `app/layout.tsx` 상단 주석 참고하여 교체

### 디자인 토큰

- [ ] `app/globals.css` — `:root`와 `.dark`의 컬러 변수 수정
  - `--point-color`: 브랜드 포인트 컬러 (manifest.json의 `theme_color`와 일치시킬 것)
  - `--bg-main`, `--text-main`: 기본 배경/텍스트

### 네비게이션

- [ ] `components/Navbar.tsx` — `NAV_ITEMS` 배열을 앱에 맞게 수정

### 인증

- [ ] Supabase Dashboard에서 OAuth Provider 활성화
- [ ] `app/login/page.tsx` — 사용할 소셜 로그인 버튼만 남기기

### 라우트 보호

- [ ] `proxy.ts` — `PUBLIC_PATHS` 공개 경로 목록 확인 및 수정

### Service Worker

- [ ] `public/sw.js` — `CACHE_NAME`을 프로젝트명으로 변경 (`'myapp-v1'` → `'yourapp-v1'`)

### 타입

- [ ] `types/user.ts` — `UserProfile` 인터페이스를 DB 스키마에 맞게 수정

### 구현 필요 페이지

- [ ] `app/items/new/page.tsx` — 실제 폼 필드 및 DB 연동 구현 (기본 골격 제공됨)
- [ ] `app/users/[id]/page.tsx` — 유저 공개 프로필 페이지 구현
- [ ] `app/onboarding/page.tsx` — 온보딩 플로우 구현
- [ ] `app/offline/page.tsx` — 오프라인 UI 개선

---

## 12. 알려진 이슈 및 결정 사항

### React Compiler & Turbopack

`reactCompiler: true`는 현재 비활성화 상태입니다. Turbopack(`turbopack: {}`)과 동시 사용 시 `babel-plugin-react-compiler` 설정 충돌이 발생할 수 있습니다. 활성화 방법은 `next.config.ts` 주석을 참고하세요.

### `{app` 폴더 (수동 삭제 필요)

프로젝트 루트에 `{app`으로 시작하는 이상한 폴더가 존재합니다. Windows에서 glob 패턴이 잘못 처리되어 생성된 것으로, 빌드나 런타임에 영향은 없지만 삭제가 권장됩니다.

```powershell
# PowerShell에서 실행
Remove-Item -Recurse -Force '.\{app'
```

> MCP 파일시스템 도구에 삭제 기능이 없어 자동 삭제가 불가능합니다.

### Lottie 동적 로딩

`<Loading variant="lottie" />`는 `lottie-react`와 `/lottie/waiting.json`을 동적으로 로드합니다. 둘 중 하나라도 없으면 `spinner` 폴백으로 자동 전환되며 런타임 에러가 발생하지 않습니다.

### Portal과 SSR

`BottomSheet`와 `Dialog`는 `useEffect + useState`로 마운트 후 `#app-root` DOM을 탐색합니다. SSR 환경에서 `document.getElementById` 직접 호출에 의한 hydration mismatch가 없습니다.

### userStore의 session

`session` 객체는 민감 토큰을 포함하므로 localStorage에 persist되지 않습니다. 페이지 로드 시 서버 컴포넌트(`RootLayout`)가 Supabase 서버 클라이언트로 세션을 조회하여 `AuthProvider`에 주입합니다.

### SmartImage vs next/image

`SmartImage`는 Next.js `<Image>` 대신 `<img>` 태그를 직접 사용합니다. Supabase Storage, 외부 CDN 등 `next.config.ts`의 `remotePatterns` 설정 없이 모든 `https://` URL을 처리하기 위한 의도적인 결정입니다. 이미지 최적화가 중요한 경우 `next/image`로 교체를 고려하세요.

### Form 컴포넌트 이름 마이그레이션

`JmanaSelect` / `JmanaSwitch` / `JmanaSlider`는 이전 프로젝트 이름이 남아있던 것으로, `AppSelect` / `AppSwitch` / `AppSlider`로 변경되었습니다. 기존 이름은 `@deprecated` alias로 유지되어 빌드 에러 없이 동작하지만, 새 코드에서는 `App*` 이름을 사용하세요.

---

## 라이선스

Private — 팀 내부 보일러플레이트용
