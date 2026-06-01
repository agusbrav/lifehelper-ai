import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import path from 'path'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  transpilePackages: ['@lifehelper/core', '@lifehelper/ui', '@lifehelper/registry'],
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg', 'pdf-parse', '@anthropic-ai/sdk', 'pdfjs-dist'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  devIndicators: {
    position: 'bottom-right',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default withNextIntl(nextConfig)
