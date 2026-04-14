import type { NextConfig } from "next"

const KREWHUB_URL = process.env.KREWHUB_INTERNAL_URL ?? 'http://127.0.0.1:8420'

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${KREWHUB_URL}/api/v1/:path*` },
      { source: '/auth/:path*', destination: `${KREWHUB_URL}/auth/:path*` },
    ]
  },
}

export default nextConfig
