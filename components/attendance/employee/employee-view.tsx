import { CalendarOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { AttendanceRecord, Employee } from "@/lib/attendance"
import { LiveClock } from "./live-clock"
import { PunchPanel } from "./punch-panel"
import { PersonalHistory } from "./personal-history"

type EmployeeViewProps = {
  employee: Employee
  records: AttendanceRecord[]
  todayISO: string
  now: Date | null
  isSunday: boolean
  onClockIn: () => void
  onClockOut: () => void
  policy?: { start_time: string; end_time: string; tolerance_minutes: number; workdays: number[] }
}

export function EmployeeView({ employee, records, todayISO, now, isSunday, onClockIn, onClockOut, policy }: EmployeeViewProps) {
  const todayRecord = records.find((r) => r.date === todayISO) ?? null
  const firstName = employee.fullName.split(" ")[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Hola, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Registra tu jornada y revisa tu historial personal.</p>
      </div>

      {isSunday && (
        <Alert className="border-primary/25 bg-accent text-accent-foreground">
          <CalendarOff aria-hidden="true" />
          <AlertTitle>Día de descanso</AlertTitle>
          <AlertDescription className="text-accent-foreground/80">
            Hoy es día de descanso según el horario asignado. Las marcaciones están deshabilitadas.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <LiveClock now={now} className="lg:col-span-3" policy={policy} />
        <PunchPanel
          className="lg:col-span-2"
          todayRecord={todayRecord}
          isSunday={isSunday}
          ready={now !== null}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
        />
      </div>

      <PersonalHistory records={records} />
    </div>
  )
}
