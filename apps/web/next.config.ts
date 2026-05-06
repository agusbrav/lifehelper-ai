import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@lifehelper/core', '@lifehelper/ui', '@lifehelper/registry'],
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  devIndicators: {
    position: 'bottom-right',
  },
}

export default nextConfig
