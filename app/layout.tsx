import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import QueryProvider from '@/components/providers/QueryProvider'
import ThemeProvider from '@/components/providers/ThemeProvider'
import { MotionProvider } from '@/components/providers/MotionProvider'
import ClientLayout from '@/components/ClientLayout'
import AuthProvider from '@/components/providers/AuthProvider'
import AppFrame from '@/components/layout/AppFrame'
import { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'
import Loading from '@/components/ui/Loading'
import { createClient } from '@/lib/supabase/server'

// ── 폰트
// Pretendard 로컬 폰트로 교체하려면:
//   import localFont from 'next/font/local'
//   const pretendard = localFont({ src: './fonts/Pretendard-Variable.woff2', variable: '--font-sans', display: 'swap' })
// 그 후 아래 notoSansKr 대신 pretendard를 사용하세요.
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-sans', // globals.css의 var(--font-sans)와 1:1 매핑
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'My App'}`,
    default: process.env.NEXT_PUBLIC_APP_NAME || 'My App',
  },
  description: '앱 설명을 여기에 입력하세요.',
  openGraph: {
    title: process.env.NEXT_PUBLIC_APP_NAME || 'My App',
    description: '앱 설명을 여기에 입력하세요.',
    locale: 'ko_KR',
    type: 'website',
  },
  icons: {
    // TODO: 실제 브랜드 아이콘으로 교체 시 SVG → PNG로 변환 후 경로만 수정
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="ko" suppressHydrationWarning className={notoSansKr.variable}>
      <head>
        {/* 다크모드 플리커 방지 — ui-storage key와 일치 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ui-storage');if(t){var p=JSON.parse(t);if(p.state&&p.state.theme==='dark')document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased overflow-hidden">
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`}
        </Script>
        <QueryProvider>
          <ThemeProvider>
            <MotionProvider>
              <AuthProvider session={session}>
                <AppFrame>
                  <Suspense fallback={<Loading />}>
                    <ClientLayout>{children}</ClientLayout>
                  </Suspense>
                </AppFrame>
              </AuthProvider>
            </MotionProvider>
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: 'text-sm font-medium',
                style: {
                  background: 'rgba(30,30,30,0.92)',
                  color: '#fff',
                  padding: '12px 20px',
                  borderRadius: '99px',
                  backdropFilter: 'blur(10px)',
                },
                success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
                error: { iconTheme: { primary: '#dc2626', secondary: 'white' } },
              }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
