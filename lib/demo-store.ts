import { DEPARTMENTS, INITIAL_EMPLOYEES, buildInitialRecords, type AttendanceRecord, type Employee } from './attendance'

export const STORAGE_KEY = 'invayal-attendance-demo-v1'
export type DemoData = { version: 1; employees: Employee[]; records: AttendanceRecord[] }

export function initialData(today: string): DemoData {
  return { version: 1, employees: INITIAL_EMPLOYEES, records: buildInitialRecords(today) }
}

export function parseData(raw: string): DemoData {
  const data = JSON.parse(raw)
  if (data?.version !== 1 || !Array.isArray(data.employees) || !Array.isArray(data.records)) throw new Error('Formato inválido')
  const ids = new Set<string>()
  const users = new Set<string>()
  for (const e of data.employees) {
    if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) || typeof e.fullName !== 'string' ||
      !DEPARTMENTS.includes(e.department) || typeof e.username !== 'string' || users.has(e.username) ||
      typeof e.credential !== 'string' || typeof e.active !== 'boolean') throw new Error('Empleado inválido')
    ids.add(e.id); users.add(e.username)
  }
  const keys = new Set<string>()
  const time = (v: unknown) => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v))
  for (const r of data.records) {
    const key = `${r?.employeeId}-${r?.date}`
    if (!r || typeof r.id !== 'string' || !ids.has(r.employeeId) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      keys.has(key) || !time(r.clockIn) || !time(r.clockOut) || (r.clockOut && (!r.clockIn || r.clockOut < r.clockIn))) throw new Error('Marcación inválida')
    keys.add(key)
  }
  return data
}

export function punch(records: AttendanceRecord[], employee: Employee, date: string, time: string, kind: 'in' | 'out', restDay: boolean) {
  if (!employee.active || restDay) throw new Error('No se permiten marcaciones para esta cuenta o día de descanso.')
  const existing = records.find(r => r.employeeId === employee.id && r.date === date)
  if (kind === 'in') {
    if (existing?.clockIn) throw new Error('Ya registraste tu entrada de hoy.')
    const record = { id: `${employee.id}-${date}`, employeeId: employee.id, date, clockIn: time, clockOut: null }
    return existing ? records.map(r => r === existing ? record : r) : [...records, record]
  }
  if (!existing?.clockIn || existing.clockOut) throw new Error('Debes tener una entrada abierta para registrar la salida.')
  if (time < existing.clockIn) throw new Error('La salida no puede ser anterior a la entrada. Revisa el reloj del dispositivo.')
  return records.map(r => r === existing ? { ...r, clockOut: time } : r)
}
