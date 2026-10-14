export type Department =
  | "Contabilidad"
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

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
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
