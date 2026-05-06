import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  const SUPPORTED_LOCALES = ['en', 'es'] as const
  type Locale = typeof SUPPORTED_LOCALES[number]
  const raw = session?.user.locale ?? 'es'
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : 'es'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
