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
  const profile = await client.from('invayal_employees').select('username,role,must_change_password').eq('user_id',login.data.user.id).single()
  assert.equal(profile.error,null)
  assert.equal(profile.data.role,'admin')
  assert.equal(profile.data.must_change_password,true)
  const clock = await client.rpc('invayal_clock', { kind: 'in' })
  assert.match(clock.error?.message ?? '', /contraseña/)
  const change = await client.functions.invoke('invayal-admin', { body: { action: 'changePassword', password: 'short' } })
  assert.ok(change.error, 'Weak password must be rejected without changing it')
  console.log('PASS: anonymous access denied, protected Edge Function, administrator login, mandatory password change and minimum password length. No attendance created.')
} finally { await client.auth.signOut() }
