import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { registerLinkableModule } from '@lifehelper/integrations'
import { budgetLinkableModule } from '@lifehelper/budget'
import './globals.css'

registerLinkableModule(budgetLinkableModule)

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'LifeHelper',
  description: 'Your personal life management platform',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'LifeHelper',
    statusBarStyle: 'default',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
