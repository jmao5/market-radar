import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // instrumentation.ts 활성화 (서버 시작 시 스케줄러 자동 등록)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
