import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LifeHelper',
    short_name: 'LifeHelper',
    description: 'Your personal life management platform',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#faf9ff',
    theme_color: '#7c5cfc',
    icons: [],
  }
}
