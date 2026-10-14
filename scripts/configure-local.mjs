import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
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
console.log('DEV configurado contra Supabase local. No se guardó ninguna clave administrativa en el frontend.')
