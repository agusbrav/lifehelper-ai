import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@lifehelper/core', '@lifehelper/ui', '@lifehelper/registry'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

export default nextConfig
