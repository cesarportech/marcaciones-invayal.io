"use client"

import { useState } from "react"
import { useDemoData } from "@/hooks/use-demo-data"
import { punch } from "@/lib/demo-store"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useNow } from "@/hooks/use-now"
import {
  DEMO_EMPLOYEE_ID,
  currentTimeHHMM,
  businessDate,
  parseISODate,
  type Employee,
} from "@/lib/attendance"
import { DemoSwitcher, type DemoView } from "./demo-switcher"
import { AppHeader } from "./app-header"
import { LoginCard, type LoginResult } from "./login-card"
import { EmployeeView } from "./employee/employee-view"
import { MasterView } from "./master/master-view"

type Session = { role: "employee"; employeeId: string } | { role: "master" } | null

export function AppShell() {
  const now = useNow()
  const [session, setSession] = useState<Session>(null)
  const [forceSunday, setForceSunday] = useState(false)
  const { data, update, reset, error } = useDemoData()
  const employees = data?.employees ?? []
  const records = data?.records ?? []

  const todayISO = now ? businessDate(now) : ''
  const isSunday = forceSunday || (todayISO ? parseISODate(todayISO).getDay() === 0 : false)

  const activeView: DemoView = !session
    ? "login"
    : session.role === "master"
      ? "master"
      : forceSunday
        ? "sunday"
        : "employee"

  const currentEmployee =
    session?.role === "employee" ? employees.find((e) => e.id === session.employeeId) ?? null : null

  const ownRecords = currentEmployee ? records.filter(r => r.employeeId === currentEmployee.id) : []

  function setEmployees(updater: (previous: Employee[]) => Employee[]) {
    update(previous => ({ ...previous, employees: updater(previous.employees) }))
  }

  function handleDemoChange(view: DemoView) {
    setForceSunday(view === "sunday")
    if (view === "login") setSession(null)
    else if (view === "master") setSession({ role: "master" })
    else setSession({ role: "employee", employeeId: DEMO_EMPLOYEE_ID })
  }

  function handleLogin(result: LoginResult) {
    setForceSunday(false)
    setSession(result.role === "master" ? { role: "master" } : { role: "employee", employeeId: result.employeeId })
  }

  function handleClockIn() {
    handlePunch('in')
  }

  function handleClockOut() {
    handlePunch('out')
  }

  function handlePunch(kind: 'in' | 'out') {
    if (!currentEmployee || !now) return
    const instant = new Date()
    const date = businessDate(instant)
    const time = currentTimeHHMM(instant)
    try {
      update(previous => {
        const employee = previous.employees.find(e => e.id === currentEmployee.id)
        if (!employee) throw new Error('Cuenta no disponible.')
        return { ...previous, records: punch(previous.records, employee, date, time, kind, forceSunday || parseISODate(date).getDay() === 0) }
      })
      toast.success(`${kind === 'in' ? 'Entrada' : 'Salida'} guardada a las ${time}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar la marcación.') }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p><strong>INVAYAL · Versión de prueba.</strong> Datos guardados solo en este navegador. Usa datos ficticios. Hora de Honduras.</p>
          <Button size="sm" variant="outline" onClick={() => {
            if (window.confirm('¿Borrar los cambios de prueba de este navegador y restaurar los ejemplos?')) {
              reset(); setSession(null); setForceSunday(false)
            }
          }}>Restablecer demo</Button>
        </div>
      </div>
      {error && <p role="alert" className="p-4 text-destructive">{error}</p>}
      {!data || !now ? <p role="status" className="p-8">{error ? 'No se pudo abrir la demostración.' : 'Cargando demostración…'}</p> : <>
      <DemoSwitcher value={activeView} onChange={handleDemoChange} />
      {session && (
        <AppHeader
          name={session.role === "master" ? "Administrador General" : currentEmployee?.fullName ?? ""}
          roleLabel={session.role === "master" ? "Usuario Maestro" : currentEmployee?.department ?? ""}
          onLogout={() => handleDemoChange("login")}
        />
      )}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div key={activeView} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!session && <LoginCard employees={employees} onLogin={handleLogin} />}
          {session?.role === "employee" && currentEmployee && (
            <EmployeeView
              employee={currentEmployee}
              records={ownRecords}
              todayISO={todayISO}
              now={now}
              isSunday={isSunday}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
            />
          )}
          {session?.role === "master" && (
            <MasterView
              employees={employees}
              records={records}
              todayISO={todayISO}
              onEmployeesChange={setEmployees}
            />
          )}
        </div>
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-muted-foreground">Política de prueba: lunes a sábado, 08:00–17:00, tolerancia de 10 minutos. Las horas son tiempo transcurrido, sin deducir descansos; no constituyen cálculo de nómina. Ausencias, permisos y jornadas sin salida requieren revisión de RR. HH.</footer>
      </>}
    </div>
  )
}
