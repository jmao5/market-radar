import { ReactNode } from 'react'

export default function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center overscroll-none bg-bg-main transition-colors duration-200">
      <div
        id="app-root"
        className="relative flex w-full max-w-md flex-col bg-bg-main shadow-2xl sm:max-w-xl h-full overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
