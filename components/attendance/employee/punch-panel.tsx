import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDuration, getWorkedMinutes, type AttendanceRecord } from "@/lib/attendance"
import { cn } from "@/lib/utils"

type PunchPanelProps = {
  todayRecord: AttendanceRecord | null
  isSunday: boolean
  ready: boolean
  onClockIn: () => void
  onClockOut: () => void
  className?: string
}

export function PunchPanel({ todayRecord, isSunday, ready, onClockIn, onClockOut, className }: PunchPanelProps) {
  const isActive = Boolean(todayRecord?.clockIn && !todayRecord.clockOut)
  const isCompleted = Boolean(todayRecord?.clockOut)
  const canClockIn = ready && !isSunday && !todayRecord?.clockIn
  const canClockOut = ready && !isSunday && isActive

  const state = isSunday
    ? { label: "Día de descanso", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" }
    : isActive
      ? { label: "Jornada Activa", className: "bg-success-soft text-success", dot: "bg-success" }
      : isCompleted
        ? { label: "Jornada Completada", className: "bg-accent text-accent-foreground", dot: "bg-primary" }
        : { label: "Fuera de Turno", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Marcación de hoy</CardTitle>
        <span
          className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", state.className)}
          role="status"
        >
          <span className={cn("size-1.5 rounded-full", state.dot, isActive && "animate-pulse")} aria-hidden="true" />
          {state.label}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-4 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Entrada</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{todayRecord?.clockIn ?? "--:--"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Salida</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{todayRecord?.clockOut ?? "--:--"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {todayRecord ? formatDuration(getWorkedMinutes(todayRecord)) : "—"}
            </dd>
          </div>
        </dl>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button size="lg" className="h-14 text-base" disabled={!canClockIn} onClick={onClockIn}>
            <LogIn aria-hidden="true" />
            Marcar Entrada
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base"
            disabled={!canClockOut}
            onClick={onClockOut}
          >
            <LogOut aria-hidden="true" />
            Marcar Salida
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {isSunday
            ? "Las marcaciones se habilitan en los días laborables asignados."
            : isCompleted
              ? "Ya completaste tu jornada de hoy. ¡Buen trabajo!"
              : isActive
                ? "Recuerda marcar tu salida al finalizar la jornada."
                : "Marca tu entrada al iniciar tu jornada laboral."}
        </p>
      </CardContent>
    </Card>
  )
}
