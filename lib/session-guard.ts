import { supabase, AUTH_STORAGE_KEY } from '@/lib/supabase-client'

// Cada cuánto el guard confirma con el servidor que la sesión (token) sigue vigente.
export const SESSION_CHECK_INTERVAL_MS = 60_000

export type SessionCheck = 'valid' | 'revoked' | 'unknown'

// Consulta auth.sessions en el servidor: detecta sesiones cerradas por el administrador
// aunque el access token local todavía no haya expirado.
export async function checkSession(): Promise<SessionCheck> {
  if (!supabase) return 'unknown'
  const { data, error } = await supabase.rpc('invayal_session_valid')
  if (error) return error.code === 'PGRST301' || error.message.includes('JWT') ? 'revoked' : 'unknown'
  return data === true ? 'valid' : 'revoked'
}

// Borra los datos de INVAYAL guardados en el navegador. Con keepAuth conserva el token de la sesión actual.
export function clearLocalData({ keepAuth }: { keepAuth: boolean }) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('invayal-') && !(keepAuth && key.startsWith(AUTH_STORAGE_KEY))) localStorage.removeItem(key)
    }
    sessionStorage.clear()
  } catch { /* Almacenamiento bloqueado por el navegador */ }
}

// Cierra la sesión: revoca el refresh token en el servidor y elimina el token local.
export async function endSession() {
  const result = await supabase?.auth.signOut({ scope: 'local' })
  clearLocalData({ keepAuth: false })
  return result?.error ?? null
}
