import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  const locale = (session?.user.locale ?? 'es') as 'en' | 'es'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
