import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const production = JSON.parse(readFileSync(new URL('../config/production.json', import.meta.url), 'utf8'))
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'marcaciones-invayal.io'
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? (repo.endsWith('.github.io') ? '' : `/${repo}`)
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_BASE_PATH: base, NEXT_PUBLIC_APP_ENV: 'prod', NEXT_PUBLIC_SUPABASE_URL: production.supabaseUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: production.supabasePublishableKey },
})
process.exit(result.status ?? 1)
