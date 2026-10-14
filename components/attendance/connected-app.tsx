"use client"

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase, appEnvironment, loginIdentity } from '@/lib/supabase-client'
import { businessDate, currentTimeHHMM, parseISODate, type AttendanceRecord, type Department, type Employee } from '@/lib/attendance'
import { useNow } from '@/hooks/use-now'
import { checkSession, clearLocalData, endSession, SESSION_CHECK_INTERVAL_MS } from '@/lib/session-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppHeader } from './app-header'
import { EmployeeView } from './employee/employee-view'
import { MasterAttendanceTable } from './master/master-attendance-table'
import { OverviewWidgets } from './master/overview-widgets'

type Profile = { id: string; user_id: string; username: string; full_name: string; department_id: string; role: 'admin' | 'employee'; active: boolean }
type DepartmentRow = { id: string; name: string }
type Policy = { start_time: string; end_time: string; tolerance_minutes: number; workdays: number[]; office_ips: string[]; require_office_network: boolean }
type SessionInfo = { sessions: number; last_seen: string | null }
type Snapshot = { profile: Profile; profiles: Profile[]; sessions: Record<string, SessionInfo>; sessionsAvailable: boolean; employees: Employee[]; records: AttendanceRecord[]; rawTimes: Record<string, { clock_in: string; clock_out: string | null }>; departments: DepartmentRow[]; policy: Policy }

async function adminAction(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Falta configurar Supabase.')
  const { data, error } = await supabase.functions.invoke('invayal-admin', { body })
  if (error) {
    let message = 'No se pudo completar la operación.'
    try { message = (await error.context.json()).error || message } catch { /* Network error */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
}

export function ConnectedApp() {
  const now = useNow()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState('attendance')
  const generation = useRef(0)

  async function refresh() {
    if (!supabase) { setLoading(false); return }
    const request = ++generation.current
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (request !== generation.current) return
      // Un error de red no debe confundirse con "sin sesión": getUser devuelve user = null en ambos casos.
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError
      if (!user) { setSignedIn(false); setSnapshot(null); setLoading(false); return }
      // Guard: el token local puede seguir siendo válido aunque el administrador haya cerrado la sesión.
      if (await checkSession() === 'revoked') { if (request === generation.current) await forceLogout(); return }
      if (request !== generation.current) return
      setSignedIn(true)
      const { data: profile, error: profileError } = await supabase.from('invayal_employees').select('*').eq('user_id', user.id).single()
      if (profileError || !profile?.active) throw new Error('Tu cuenta no está habilitada para INVAYAL. Contacta al administrador.')
      const [employeesResult, departmentsResult, policyResult] = await Promise.all([
        supabase.from('invayal_employees').select('*').order('full_name'),
        supabase.from('invayal_departments').select('*').order('name'),
        supabase.from('invayal_attendance_policy').select('*').single(),
      ])
      if (employeesResult.error || departmentsResult.error || policyResult.error) throw new Error('No se pudo cargar la información de asistencia.')
      const sessions: Record<string, SessionInfo> = {}
      let sessionsAvailable = true
      if (profile.role === 'admin') {
        // Las sesiones son información complementaria: si fallan, el panel sigue funcionando.
        const { data, error } = await supabase.rpc('invayal_active_sessions')
        if (error || !Array.isArray(data)) {
          sessionsAvailable = false
          console.error('INVAYAL: no se pudieron cargar las sesiones activas', error)
        }
        else for (const row of data as Array<{ user_id: string } & SessionInfo>) sessions[row.user_id] = { sessions: row.sessions, last_seen: row.last_seen }
      }
      const rawRecords: Array<{ id: string; employee_id: string; work_date: string; clock_in: string; clock_out: string | null; scheduled_start: string; tolerance_minutes: number }> = []
      // Paginación explícita para no perder registros al alcanzar el límite de la API.
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from('invayal_attendance').select('*').order('work_date', { ascending: false }).order('id').range(offset, offset + 999)
        if (error) throw error
        rawRecords.push(...data)
        if (data.length < 1000) break
      }
      if (request !== generation.current) return
      const departments = departmentsResult.data as DepartmentRow[]
      const profiles = employeesResult.data as Profile[]
      const employees = profiles.map(p => ({ id: p.id, fullName: p.full_name, username: p.username, department: (departments.find(d => d.id === p.department_id)?.name ?? '') as Department, active: p.active }))
      const records = rawRecords.map(r => ({ id: r.id, employeeId: r.employee_id, date: r.work_date, clockIn: currentTimeHHMM(new Date(r.clock_in)), clockOut: r.clock_out ? currentTimeHHMM(new Date(r.clock_out)) : null, scheduledStart: r.scheduled_start.slice(0,5), toleranceMinutes: r.tolerance_minutes }))
      const rawTimes = Object.fromEntries(rawRecords.map(r => [r.id, { clock_in: r.clock_in, clock_out: r.clock_out }]))
      setSnapshot({ profile, profiles, sessions, sessionsAvailable, employees, records, rawTimes, departments, policy: policyResult.data })
      setError('')
    } catch (e) {
      if (request === generation.current) { setSnapshot(null); setError(e instanceof Error ? e.message : 'No se pudo conectar con Supabase.') }
    } finally { if (request === generation.current) setLoading(false) }
  }

  useEffect(() => {
    void refresh()
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(() => void refresh(), 0) })
    const focus = () => void refresh()
    window.addEventListener('focus', focus)
    return () => { generation.current++; subscription?.data.subscription.unsubscribe(); window.removeEventListener('focus', focus) }
  }, [])

  // Guard periódico: si el token fue revocado en el servidor, se elimina también del navegador.
  useEffect(() => {
    if (!signedIn) return
    const timer = window.setInterval(async () => { if (await checkSession() === 'revoked') await forceLogout() }, SESSION_CHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [signedIn])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.') }
    finally { setBusy(false) }
  }

  async function login(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.auth.signInWithPassword({ email: loginIdentity(username), password })
      if (error) throw new Error('Usuario o contraseña incorrectos, o acceso temporalmente limitado.')
      setPassword(''); await refresh()
    })
  }

  async function logout() {
    ++generation.current
    setSnapshot(null); setSignedIn(false); setTab('attendance')
    const failure = await endSession()
    if (failure) setError('La sesión se cerró en este navegador, pero el servidor no confirmó la revocación del token.')
  }

  async function forceLogout() {
    await logout()
    setError('Tu sesión fue cerrada o expiró. Vuelve a ingresar.')
  }

  const today = now ? businessDate(now) : ''
  const restDay = !!today && !!snapshot && !snapshot.policy.workdays.includes(parseISODate(today).getDay())
  const employee = snapshot?.employees.find(e => e.id === snapshot.profile.id)

  return <div className="min-h-dvh bg-background">
    <div className="border-b bg-primary px-4 py-2 text-center text-xs text-primary-foreground">INVAYAL · {appEnvironment} · Hora de Honduras</div>
    {signedIn && <AppHeader name={snapshot?.profile.full_name ?? 'INVAYAL'} roleLabel={snapshot?.profile.role === 'admin' ? 'Administración de RR. HH.' : 'Empleado'} onLogout={() => void logout()} />}
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {!supabase ? <Card><CardHeader><CardTitle>Configura la conexión local</CardTitle></CardHeader><CardContent>Faltan la URL y la clave pública de Supabase para este entorno. Consulta el README del proyecto.</CardContent></Card> : <>
        {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}{signedIn && <Button className="ml-3" variant="outline" onClick={() => void refresh()}>Reintentar</Button>}</div>}
        {loading ? <p role="status">Conectando con INVAYAL…</p> : !signedIn ? <Card className="mx-auto mt-10 max-w-md">
          <CardHeader><CardTitle className="text-2xl">Bienvenido a INVAYAL</CardTitle><p className="text-sm text-muted-foreground">Ingresa para registrar tu jornada laboral.</p></CardHeader>
          <CardContent><form onSubmit={login} className="flex flex-col gap-4">
            <Label htmlFor="login-user">Usuario</Label><Input id="login-user" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
            <Label htmlFor="login-password">Contraseña</Label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button disabled={busy} type="submit">{busy ? 'Ingresando…' : 'Ingresar'}</Button>
            <p className="text-xs text-muted-foreground">Si olvidaste tu contraseña, solicita un restablecimiento al administrador.</p>
          </form></CardContent>
        </Card> : snapshot && <>
          <>
            <div className="mb-6 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => void refresh()}>Actualizar registros</Button></div>
            {snapshot.profile.role === 'admin' ? <div className="flex flex-col gap-6">
              <div><h1 className="text-2xl font-semibold">Control de asistencia</h1><p className="text-muted-foreground">Empleados, jornadas y reportes de INVAYAL.</p></div>
              <OverviewWidgets employees={snapshot.employees} records={snapshot.records} todayISO={today} />
              <nav aria-label="Secciones de administración" className="flex flex-wrap gap-2">{[['attendance','Asistencia'],['employees','Empleados'],['corrections','Correcciones'],['maintenance','Mantenimiento']].map(([key,label]) => <Button key={key} variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key)}>{label}</Button>)}</nav>
              {tab === 'attendance' && <MasterAttendanceTable employees={snapshot.employees} records={snapshot.records} todayISO={today} />}
              {tab === 'employees' && <EmployeeAdmin snapshot={snapshot} refresh={refresh} />}
              {tab === 'corrections' && <CorrectionForm snapshot={snapshot} refresh={refresh} />}
              {tab === 'maintenance' && <div className="flex flex-col gap-6"><OfficeNetwork policy={snapshot.policy} refresh={refresh} /><PurgeHistory refresh={refresh} /></div>}
            </div> : employee && <div aria-busy={busy} className={busy ? 'pointer-events-none opacity-70' : ''}><EmployeeView employee={employee} records={snapshot.records} todayISO={today} now={now} isSunday={restDay} policy={snapshot.policy} onClockIn={() => void run(async () => { const { error } = await supabase!.rpc('invayal_clock', { kind: 'in' }); if (error) throw new Error(error.message); await refresh(); toast.success('Entrada registrada en Supabase.') })} onClockOut={() => void run(async () => { const { error } = await supabase!.rpc('invayal_clock', { kind: 'out' }); if (error) throw new Error(error.message); await refresh(); toast.success('Salida registrada en Supabase.') })} /></div>}
          </>
        </>}
      </>}
    </main>
    <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground">Las marcaciones se guardan con la hora del servidor. Las horas mostradas son tiempo transcurrido, sin descontar pausas. Permisos, ausencias y nómina requieren revisión de RR. HH.</footer>
  </div>
}

function sessionLabel(info: SessionInfo | undefined, available: boolean) {
  if (!available) return 'Estado de sesiones no disponible'
  if (!info) return 'Sin sesión activa'
  const seen = info.last_seen ? new Intl.DateTimeFormat('es-HN', { timeZone: 'America/Tegucigalpa', dateStyle: 'short', timeStyle: 'short' }).format(new Date(info.last_seen)) : '—'
  return `${info.sessions} ${info.sessions === 1 ? 'sesión activa' : 'sesiones activas'} · última actividad ${seen}`
}

function EmployeeAdmin({ snapshot, refresh }: { snapshot: Snapshot; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetId, setResetId] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form))
    setBusy(true); setError('')
    try { await adminAction(resetId ? { action: 'resetPassword', employeeId: resetId, password: values.password } : { action: 'create', ...values }); form.reset(); setResetId(''); await refresh(); toast.success(resetId ? 'Contraseña restablecida. Se cerraron las sesiones del usuario.' : 'Empleado creado.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar.') } finally { setBusy(false) }
  }
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <Card><CardHeader><CardTitle>Empleados ({snapshot.profiles.length})</CardTitle></CardHeader><CardContent className="space-y-3">
      {snapshot.profiles.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{p.full_name}</p><p className="text-xs text-muted-foreground">{p.username} · {p.role === 'admin' ? 'Administrador' : 'Empleado'} · {p.active ? 'Activo' : 'Inactivo'}</p><p className="text-xs text-muted-foreground">{sessionLabel(snapshot.sessions[p.user_id], snapshot.sessionsAvailable)}</p></div><div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy || p.role === 'admin'} onClick={() => setResetId(p.id)}>Restablecer contraseña</Button>
        <Button variant="outline" size="sm" disabled={busy || p.role === 'admin'} onClick={async () => { setBusy(true); setError(''); try { await adminAction({ action: 'setActive', employeeId: p.id, active: !p.active }); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setBusy(false) } }}>{p.active ? 'Desactivar' : 'Activar'}</Button>
        <Button variant="outline" size="sm" disabled={busy || p.id === snapshot.profile.id || !snapshot.sessions[p.user_id]} onClick={async () => { setBusy(true); setError(''); try { await adminAction({ action: 'revokeSessions', employeeId: p.id }); await refresh(); toast.success(`Sesión cerrada para ${p.username}.`) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión.') } finally { setBusy(false) } }}>Cerrar sesión</Button>
      </div></div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{resetId ? `Nueva contraseña: ${snapshot.profiles.find(p => p.id === resetId)?.username}` : 'Crear empleado'}</CardTitle></CardHeader><CardContent>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {!resetId && <><Label htmlFor="fullName">Nombre completo</Label><Input name="fullName" id="fullName" minLength={3} maxLength={150} required /><Label htmlFor="username">Usuario</Label><Input name="username" id="username" pattern="[a-z0-9._]{3,30}" title="De 3 a 30 letras minúsculas, números, puntos o guiones bajos" required /><Label htmlFor="departmentId">Departamento</Label><select className="h-10 rounded-md border bg-background px-3" name="departmentId" id="departmentId" required>{snapshot.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></>}
        <Label htmlFor="initial-password">Contraseña</Label><Input id="initial-password" name="password" type="password" autoComplete="new-password" minLength={4} maxLength={72} required />
        <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>{resetId && <Button type="button" variant="outline" onClick={() => setResetId('')}>Cancelar</Button>}
        <p className="text-xs text-muted-foreground">Entrega la contraseña al empleado de forma privada. No se muestra ni se guarda en los reportes.</p>
      </form>
    </CardContent></Card>
  </div>
}

function CorrectionForm({ snapshot, refresh }: { snapshot: Snapshot; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recordId, setRecordId] = useState('')
  const record = snapshot.records.find(r => r.id === recordId)
  return <Card><CardHeader><CardTitle>Corregir una jornada</CardTitle><p className="text-sm text-muted-foreground">La corrección conserva el registro original y su motivo en la auditoría.</p></CardHeader><CardContent>
    <Label htmlFor="correction-record">Jornada</Label><select id="correction-record" value={recordId} onChange={e => setRecordId(e.target.value)} className="my-3 h-10 w-full rounded-md border bg-background px-3"><option value="">Seleccionar registro</option>{snapshot.records.map(r => <option key={r.id} value={r.id}>{r.date} · {snapshot.employees.find(e => e.id === r.employeeId)?.fullName}</option>)}</select>
    {record && <form key={record.id} className="flex max-w-xl flex-col gap-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(''); const values = new FormData(e.currentTarget)
      try {
        // Honduras no tiene horario de verano: UTC-6 fijo. Si la hora no cambió se envía la marca original para no perder los segundos.
        const original = snapshot.rawTimes[record.id]
        const entry = String(values.get('entry') ?? ''), exit = String(values.get('exit') ?? '')
        const newIn = entry === record.clockIn && original ? original.clock_in : `${record.date}T${entry}:00-06:00`
        const newOut = !exit ? null : exit === record.clockOut && original?.clock_out ? original.clock_out : `${record.date}T${exit}:00-06:00`
        const { error } = await supabase!.rpc('invayal_correct_attendance', { record_id: record.id, new_in: newIn, new_out: newOut, reason: values.get('reason') })
        if (error) throw new Error(error.message)
        await refresh(); setRecordId(''); toast.success('Corrección guardada con auditoría.')
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo corregir.') } finally { setBusy(false) }
    }}><Label htmlFor="entry">Entrada (Honduras)</Label><Input type="time" name="entry" id="entry" defaultValue={record.clockIn ?? ''} required /><Label htmlFor="exit">Salida (dejar vacía si está pendiente)</Label><Input type="time" name="exit" id="exit" defaultValue={record.clockOut ?? ''} /><Label htmlFor="reason">Motivo</Label><Input name="reason" id="reason" minLength={10} maxLength={500} required /><Button type="submit" disabled={busy}>{busy ? 'Guardando corrección…' : 'Guardar corrección'}</Button></form>}
    {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
  </CardContent></Card>
}

// IPv6 cambia dentro del prefijo /64 que asigna el proveedor; IPv4 se guarda como dirección exacta.
function officeRange(ip: string) {
  return ip.includes(':') ? `${ip}/64` : ip
}

function OfficeNetwork({ policy, refresh }: { policy: Policy; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [network, setNetwork] = useState<{ ip: string | null; allowed: boolean } | null>(null)
  const [manual, setManual] = useState('')

  async function detect() {
    const { data, error } = await supabase!.rpc('invayal_network_info')
    if (error) throw new Error(error.message)
    setNetwork(data)
  }
  useEffect(() => { detect().catch(e => setError(e instanceof Error ? e.message : 'No se pudo detectar la red.')) }, [policy])

  async function save(changes: Partial<Pick<Policy, 'office_ips' | 'require_office_network'>>, message: string) {
    setBusy(true); setError('')
    try {
      const { error } = await supabase!.from('invayal_attendance_policy').update(changes).eq('id', true)
      if (error) throw new Error(error.code === '23514' ? 'Agrega al menos una IP antes de activar la restricción.' : error.code === '22P02' ? 'La IP no es válida.' : error.message)
      await refresh(); toast.success(message)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setBusy(false) }
  }
  const add = (ip: string) => policy.office_ips.includes(ip) ? setError('Esa IP ya está en la lista.') : void save({ office_ips: [...policy.office_ips, ip] }, `IP ${ip} agregada.`)

  return <Card className="max-w-xl"><CardHeader><CardTitle>Red de la oficina</CardTitle><p className="text-sm text-muted-foreground">Con la restricción activa, solo se puede marcar desde la conexión a internet de la oficina. La IP de cada marcación queda registrada.</p></CardHeader><CardContent className="flex flex-col gap-4">
    <div className="rounded-lg border p-3 text-sm">
      <p>Estado: <strong>{policy.require_office_network ? 'Restricción activa' : 'Restricción desactivada (se puede marcar desde cualquier red)'}</strong></p>
      <p className="mt-1 text-muted-foreground">Tu IP actual: {network ? (network.ip ?? 'no detectada') : '…'}{network?.ip && (network.allowed ? ' · permitida' : ' · no está en la lista')}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy || !network?.ip || network.allowed} onClick={() => network?.ip && add(officeRange(network.ip))}>Agregar mi IP actual</Button>
      <Button type="button" variant={policy.require_office_network ? 'outline' : 'default'} disabled={busy || (!policy.require_office_network && policy.office_ips.length === 0)} onClick={() => void save({ require_office_network: !policy.require_office_network }, policy.require_office_network ? 'Restricción desactivada.' : 'Restricción activada.')}>{policy.require_office_network ? 'Desactivar restricción' : 'Activar restricción'}</Button>
    </div>
    <ul className="flex flex-col gap-2">{policy.office_ips.map(ip => <li key={ip} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm"><span className="font-mono">{ip}</span><Button type="button" variant="outline" size="sm" disabled={busy || (policy.require_office_network && policy.office_ips.length === 1)} onClick={() => void save({ office_ips: policy.office_ips.filter(x => x !== ip) }, `IP ${ip} eliminada.`)}>Quitar</Button></li>)}</ul>
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add(manual.trim()); setManual('') }}>
      <Input aria-label="IP de la oficina" placeholder="Ej. 190.5.100.20" value={manual} onChange={e => setManual(e.target.value)} required />
      <Button type="submit" variant="outline" disabled={busy}>Agregar</Button>
    </form>
    <p className="text-xs text-muted-foreground">Usa “Agregar mi IP actual” estando conectado al Wi-Fi de la oficina. Si la oficina tiene varios proveedores de internet, agrega la IP de cada uno.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent></Card>
}

function PurgeHistory({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  return <Card className="max-w-xl border-destructive/40"><CardHeader><CardTitle>Borrar todo el historial</CardTitle><p className="text-sm text-muted-foreground">Elimina todas las marcaciones de la base de datos, sus registros de auditoría y los datos guardados en este navegador. Esta acción no se puede deshacer.</p></CardHeader><CardContent>
    <form className="flex flex-col gap-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('')
      try {
        const { data, error } = await supabase!.rpc('invayal_purge_history', { confirmation })
        if (error) throw new Error(error.message)
        clearLocalData({ keepAuth: true })
        setConfirmation(''); await refresh(); toast.success(`Historial borrado: ${data ?? 0} registros eliminados.`)
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo borrar el historial.') } finally { setBusy(false) }
    }}>
      <Label htmlFor="purge-confirmation">Escribe BORRAR TODO para confirmar</Label><Input id="purge-confirmation" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} required />
      <Button type="submit" variant="destructive" disabled={busy || confirmation !== 'BORRAR TODO'}>{busy ? 'Borrando…' : 'Borrar todo el historial'}</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
  </CardContent></Card>
}
