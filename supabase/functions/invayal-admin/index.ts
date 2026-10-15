import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const origins = new Set(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4173', 'http://127.0.0.1:4173', 'https://cesarportech.github.io'])
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin && origins.has(origin) ? origin : 'https://cesarportech.github.io', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' }
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers })
  if (origin && !origins.has(origin)) return respond({ error: 'Origen no permitido.' }, 403)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return respond({ error: 'Método no permitido.' }, 405)
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return respond({ error: 'Inicia sesión.' }, 401)
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user) return respond({ error: 'Sesión inválida.' }, 401)
  const sessionClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data: validSession, error: sessionError } = await sessionClient.rpc('invayal_session_valid')
  if (sessionError || !validSession) return respond({ error: 'Sesión caducada. Vuelve a ingresar.' }, 401)
  const { data: actor, error: actorError } = await client.from('invayal_employees').select('*').eq('user_id', auth.user.id).single()
  if (actorError || !actor?.active) return respond({ error: 'Cuenta no habilitada.' }, 403)
  // La acción ya se aplicó: un fallo de auditoría se registra pero no se reporta como error al usuario.
  const audit = async (row: Record<string, unknown>) => {
    const { error } = await client.from('invayal_audit_log').insert({ actor_user_id: actor.user_id, ...row })
    if (error) console.error('invayal-admin: no se pudo auditar', row.operation, error)
  }
  try {
    const body = await req.json()
    if (typeof body.password === 'string' && (body.password.length < 6 || body.password.length > 72)) return respond({ error: 'La contraseña debe tener entre 6 y 72 caracteres.' }, 400)
    if (actor.role !== 'admin') return respond({ error: 'Se requiere acceso de administrador.' }, 403)
    if (body.action === 'create') {
      const username = String(body.username ?? '').trim().toLowerCase()
      const fullName = String(body.fullName ?? '').trim()
      if (!/^[a-z0-9._]{3,30}$/.test(username) || fullName.length < 3 || fullName.length > 150 || typeof body.password !== 'string') return respond({ error: 'Revisa nombre, usuario y contraseña.' }, 400)
      const { data: department } = await client.from('invayal_departments').select('id').eq('name', 'Contabilidad').single()
      if (!department) return respond({ error: 'Departamento inválido.' }, 400)
      const { data: existing } = await client.from('invayal_employees').select('id').eq('username', username).maybeSingle()
      if (existing) return respond({ error: 'El usuario ya existe.' }, 409)
      const { data: created, error } = await client.auth.admin.createUser({ email: `${username}@invayal.invalid`, password: body.password, email_confirm: true })
      if (error || !created.user) return respond({ error: 'No se pudo crear la cuenta. Verifica que el usuario no exista.' }, 400)
      const { error: saved } = await client.from('invayal_employees').insert({ user_id: created.user.id, username, full_name: fullName, department_id: department.id, role: 'employee', active: true })
      if (saved) {
        await client.auth.admin.deleteUser(created.user.id)
        throw saved
      }
      await audit({ entity: 'auth', operation: 'USER_CREATED', after_data: { username }, reason: 'Alta de empleado' })
      return respond({ ok: true })
    }
    const { data: target } = await client.from('invayal_employees').select('*').eq('id', body.employeeId).single()
    if (!target) return respond({ error: 'Empleado no encontrado.' }, 404)
    if (target.id === actor.id) return respond({ error: 'No puedes modificar tu propia cuenta desde aquí.' }, 400)
    if (body.action === 'revokeSessions') {
      // Cierra todas las sesiones del usuario: elimina sus refresh tokens y el guard invalida el access token vigente.
      if (!target.user_id) return respond({ error: 'La cuenta no tiene acceso configurado.' }, 400)
      const { error } = await client.rpc('invayal_revoke_sessions', { target_user: target.user_id })
      if (error) throw error
      await audit({ entity: 'auth', operation: 'SESSIONS_REVOKED', after_data: { employee_id: target.id }, reason: 'Cierre de sesión por administrador' })
      return respond({ ok: true })
    }
    // Un administrador no puede desactivar ni tomar la cuenta de otro administrador.
    if (target.role === 'admin') return respond({ error: 'Las cuentas de administrador no se gestionan desde aquí.' }, 403)
    if (body.action === 'updateEmployee') {
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
      if (fullName.length < 3 || fullName.length > 150) return respond({ error: 'El nombre debe tener entre 3 y 150 caracteres.' }, 400)
      const { data: department } = await client.from('invayal_departments').select('id').eq('name', 'Contabilidad').single()
      if (!department) return respond({ error: 'Departamento inválido.' }, 400)
      const { error } = await client.from('invayal_employees').update({ full_name: fullName, department_id: department.id }).eq('id', target.id)
      if (error) throw error
      await audit({ entity: 'employee', operation: 'EMPLOYEE_UPDATED', before_data: { id: target.id, full_name: target.full_name, department_id: target.department_id }, after_data: { id: target.id, full_name: fullName, department_id: department.id }, reason: 'Edición de empleado por administrador' })
      return respond({ ok: true })
    }
    if (body.action === 'setActive') {
      if (typeof body.active !== 'boolean') return respond({ error: 'Estado de acceso inválido.' }, 400)
      const { error } = await client.from('invayal_employees').update({ active: body.active }).eq('id', target.id)
      if (error) throw error
      await audit({ entity: 'employee', operation: 'ACCESS_CHANGED', after_data: { id: target.id, active: body.active }, reason: 'Cambio de acceso por administrador' })
      return respond({ ok: true })
    }
    if (body.action === 'resetPassword') {
      if (!target.user_id || typeof body.password !== 'string') return respond({ error: 'Cuenta o contraseña inválida.' }, 400)
      // Revoca antes de cambiar la contraseña: si la revocación falla, la contraseña anterior queda intacta.
      const { error: revokeError } = await client.rpc('invayal_revoke_sessions', { target_user: target.user_id })
      if (revokeError) throw revokeError
      const { error } = await client.auth.admin.updateUserById(target.user_id, { password: body.password })
      if (error) throw error
      await audit({ entity: 'auth', operation: 'PASSWORD_RESET', after_data: { employee_id: target.id }, reason: 'Restablecimiento por administrador' })
      return respond({ ok: true })
    }
    return respond({ error: 'Acción inválida.' }, 400)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'weak_password') return respond({ error: 'La contraseña no cumple los requisitos de seguridad. Usa al menos 6 caracteres y evita contraseñas comunes.' }, 400)
      if (error.code === 'same_password') return respond({ error: 'La nueva contraseña debe ser diferente de la anterior.' }, 400)
    }
    console.error('invayal-admin:', error)
    return respond({ error: 'No se pudo completar la operación. Verifica los datos e inténtalo de nuevo.' }, 400)
  }
})
