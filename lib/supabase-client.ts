import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'invayal-auth' },
}) : null

export const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV === 'prod' ? 'Producción' : 'Desarrollo local'

export function loginIdentity(username: string) {
  const value = username.trim().toLowerCase()
  if (!/^[a-z0-9._]{3,30}$/.test(value)) throw new Error('Usuario inválido.')
  return `${value}@invayal.invalid`
}
