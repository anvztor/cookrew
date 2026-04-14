import type { NextConfig } from "next"

const BFF_URL = process.env.BFF_INTERNAL_URL ?? 'http://127.0.0.1:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BFF_URL}/api/:path*` },
      { source: '/auth/callback', destination: `${BFF_URL}/auth/callback` },
    ]
  },
}

export default nextConfig
