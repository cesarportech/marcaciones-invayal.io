import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const config = JSON.parse(readFileSync('config/production.json','utf8'))
const credentials = JSON.parse(readFileSync('.invayal-private/admin-initial.json','utf8'))
const client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
const anonymous = await client.from('invayal_employees').select('id')
assert.ok(anonymous.error || anonymous.data.length === 0, 'Anonymous access must be denied')
const unauth = await client.functions.invoke('invayal-admin', { body: { action: 'create' } })
assert.ok(unauth.error, 'Administrative function requires authentication')
const login = await client.auth.signInWithPassword({ email: `${credentials.username}@invayal.invalid`, password: credentials.password })
assert.equal(login.error, null, 'Administrator login must succeed')
try {
  const profile = await client.from('invayal_employees').select('id,username,role').eq('user_id',login.data.user.id).single()
  assert.equal(profile.error,null)
  assert.equal(profile.data.role,'admin')
  const sessions = await client.rpc('invayal_active_sessions')
  assert.equal(sessions.error, null)
  assert.ok(sessions.data.some(s => s.user_id === login.data.user.id), 'The current session must be listed')
  const purge = await client.rpc('invayal_purge_history', { confirmation: 'no' })
  assert.match(purge.error?.message ?? '', /BORRAR TODO/, 'Purge must require explicit confirmation')
  const reset = await client.functions.invoke('invayal-admin', { body: { action: 'resetPassword', employeeId: profile.data.id, password: 'short' } })
  assert.ok(reset.error, 'Weak password must be rejected without changing it')
  console.log('PASS: anonymous access denied, protected Edge Function, administrator login, session listing, purge confirmation and minimum password length. No data changed.')
} finally { await client.auth.signOut() }
