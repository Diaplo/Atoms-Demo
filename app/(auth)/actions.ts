'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerCookieMethods } from '@/lib/supabase/cookies'

export async function logoutAction() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createServerCookieMethods(
        {
          get: name => cookieStore.get(name),
          getAll: () => cookieStore.getAll(),
          set: (name, value, options) => cookieStore.set(name, value, options),
        },
        '[logoutAction]'
      ),
    }
  )
  
  await supabase.auth.signOut({ scope: 'local' })
  
  redirect('/login')
}
