import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lifehelper/core', '@lifehelper/ui', '@lifehelper/registry'],
}

export default nextConfig
