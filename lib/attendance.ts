export type Department =
  | "Operaciones"
  | "Ventas"
  | "Finanzas"
  | "Tecnología"
  | "Recursos Humanos"

export const DEPARTMENTS: Department[] = [
  "Operaciones",
  "Ventas",
  "Finanzas",
  "Tecnología",
  "Recursos Humanos",
]

export type Employee = {
  id: string
  fullName: string
  department: Department
  username: string
  credential: string
  active: boolean
}

export type AttendanceRecord = {
  id: string
  employeeId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  scheduledStart?: string
  toleranceMinutes?: number
}

export type AttendanceStatus = "on-time" | "late" | "absent"

export const SHIFT_START = "08:00"
export const LATE_TOLERANCE_MINUTES = 10
export const TIME_ZONE = "America/Tegucigalpa"

export function businessDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export const MASTER_CREDENTIALS = { username: "admin", password: "admin123" }

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: "e1", fullName: "Ana Lucía Torres", department: "Operaciones", username: "atorres", credential: "1234", active: true },
  { id: "e2", fullName: "Carlos Mendoza", department: "Ventas", username: "cmendoza", credential: "2468", active: true },
  { id: "e3", fullName: "María Fernanda Ríos", department: "Finanzas", username: "mrios", credential: "1357", active: true },
  { id: "e4", fullName: "Jorge Salazar", department: "Tecnología", username: "jsalazar", credential: "9876", active: true },
  { id: "e5", fullName: "Valentina Herrera", department: "Recursos Humanos", username: "vherrera", credential: "4321", active: true },
  { id: "e6", fullName: "Diego Paredes", department: "Operaciones", username: "dparedes", credential: "1111", active: true },
  { id: "e7", fullName: "Camila Rojas", department: "Ventas", username: "crojas", credential: "2222", active: true },
  { id: "e8", fullName: "Luis Alberto Vega", department: "Tecnología", username: "lvega", credential: "3333", active: true },
  { id: "e9", fullName: "Sofía Castillo", department: "Finanzas", username: "scastillo", credential: "5555", active: false },
  { id: "e10", fullName: "Ricardo Núñez", department: "Operaciones", username: "rnunez", credential: "7777", active: false },
]

export const DEMO_EMPLOYEE_ID = "e1"

function seededRandom(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function buildInitialRecords(todayISO: string, days = 21): AttendanceRecord[] {
  const today = parseISODate(todayISO)
  const records: AttendanceRecord[] = []
  const rand = seededRandom(Number(todayISO.replaceAll("-", "")))

  for (let offset = days; offset >= 1; offset--) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    if (date.getDay() === 0) continue
    const iso = toISODate(date)

    for (const employee of INITIAL_EMPLOYEES) {
      if (!employee.active && offset < 10) continue
      const roll = rand()
      if (roll < 0.06) {
        records.push({ id: `${employee.id}-${iso}`, employeeId: employee.id, date: iso, clockIn: null, clockOut: null })
        continue
      }
      const lateness = roll > 0.82 ? 12 + Math.floor(rand() * 40) : Math.floor(rand() * 14) - 9
      const inMinutes = timeToMinutes(SHIFT_START) + lateness
      const outMinutes = timeToMinutes("17:00") + Math.floor(rand() * 50) - 10
      records.push({
        id: `${employee.id}-${iso}`,
        employeeId: employee.id,
        date: iso,
        clockIn: minutesToTime(inMinutes),
        clockOut: minutesToTime(outMinutes),
      })
    }
  }

  if (today.getDay() !== 0) {
    const todayIn: Record<string, string> = {
      e2: "07:54",
      e3: "08:21",
      e4: "07:58",
      e5: "08:03",
      e7: "08:34",
      e8: "07:49",
    }
    for (const [employeeId, clockIn] of Object.entries(todayIn)) {
      records.push({ id: `${employeeId}-${todayISO}`, employeeId, date: todayISO, clockIn, clockOut: null })
    }
  }

  return records
}

export function getStatus(record: AttendanceRecord): AttendanceStatus {
  if (!record.clockIn) return "absent"
  const limit = timeToMinutes(record.scheduledStart ?? SHIFT_START) + (record.toleranceMinutes ?? LATE_TOLERANCE_MINUTES)
  return timeToMinutes(record.clockIn) > limit ? "late" : "on-time"
}

export function getWorkedMinutes(record: AttendanceRecord) {
  if (!record.clockIn || !record.clockOut) return null
  return Math.max(0, timeToMinutes(record.clockOut) - timeToMinutes(record.clockIn))
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${String(m).padStart(2, "0")}m`
}

export function formatDisplayDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseISODate(iso))
}

export function currentTimeHHMM(now: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  "on-time": "A tiempo",
  late: "Tardanza",
  absent: "Ausente",
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
