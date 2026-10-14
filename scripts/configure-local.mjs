import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const cli = process.platform === 'win32' ? 'node_modules/supabase/bin/supabase.exe' : 'node_modules/supabase/bin/supabase'
const result = spawnSync(cli, ['status', '-o', 'env'], { encoding: 'utf8' })
if (result.status !== 0) { console.error('Inicia Docker y ejecuta npx supabase start antes de configurar dev.'); process.exit(1) }
const entries = Object.fromEntries(result.stdout.split(/\r?\n/).filter(line => line.includes('=')).map(line => {
  const split = line.indexOf('='); return [line.slice(0,split), line.slice(split+1).replace(/^"|"$/g,'')]
}))
if (!entries.API_URL || !entries.ANON_KEY) throw new Error('No se encontró la configuración pública de Supabase local.')
const url = new URL(entries.API_URL)
if (!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('DEV debe usar una base local.')
writeFileSync('.env.development.local', `NEXT_PUBLIC_APP_ENV=dev\nNEXT_PUBLIC_SUPABASE_URL=${entries.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${entries.ANON_KEY}\nNEXT_PUBLIC_BASE_PATH=\n`)
if (!entries.SERVICE_ROLE_KEY) throw new Error('Falta la clave administrativa local para inicializar DEV.')
const local = createClient(entries.API_URL, entries.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { count, error: lookupError } = await local.from('invayal_employees').select('id', { count: 'exact', head: true }).eq('role', 'admin')
if (lookupError) throw new Error('Aplica las migraciones locales antes de configurar DEV.')
if (count === 0) {
  const { data: department, error: departmentError } = await local.from('invayal_departments').select('id').eq('name','Recursos Humanos').single()
  if (departmentError) throw new Error('Falta el catálogo local de departamentos.')
  const password = `Dev-${randomBytes(18).toString('base64url')}!`
  const { data, error } = await local.auth.admin.createUser({ email: 'administrador@invayal.invalid', password, email_confirm: true })
  if (error) throw new Error('No se pudo crear el administrador local. Revisa si ya existe en Auth.')
  const { error: saved } = await local.from('invayal_employees').insert({ user_id: data.user.id, username: 'administrador', full_name: 'Administrador DEV', department_id: department.id, role: 'admin', active: true, must_change_password: true })
  if (saved) { await local.auth.admin.deleteUser(data.user.id); throw new Error('No se pudo vincular el administrador local.') }
  mkdirSync('.invayal-private', { recursive: true })
  writeFileSync('.invayal-private/ACCESO-DEV.txt', `Solo DEV local\nUsuario: administrador\nContraseña temporal: ${password}\n`)
  console.log('Administrador DEV creado. Acceso en .invayal-private/ACCESO-DEV.txt.')
}
console.log('DEV configurado contra Supabase local. No se guardó ninguna clave administrativa en el frontend.')
