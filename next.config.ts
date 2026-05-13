import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // instrumentation.ts는 Next.js 최신 버전에서 기본 지원되므로 설정 생략 가능
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
