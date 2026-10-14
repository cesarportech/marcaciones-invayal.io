import { AlarmClock, UserCheck, UserX, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getStatus, type AttendanceRecord, type Employee } from "@/lib/attendance"
import { cn } from "@/lib/utils"

type OverviewWidgetsProps = {
  employees: Employee[]
  records: AttendanceRecord[]
  todayISO: string
}

export function OverviewWidgets({ employees, records, todayISO }: OverviewWidgetsProps) {
  const today = records.filter((r) => r.date === todayISO)
  const activeCount = employees.filter((e) => e.active).length
  const clockedIn = today.filter((r) => r.clockIn && !r.clockOut).length
  const late = today.filter((r) => getStatus(r) === "late").length
  const inactive = employees.length - activeCount

  const widgets = [
    {
      label: "Total de empleados",
      value: employees.length,
      hint: `${activeCount} activos`,
      icon: Users,
      tone: "bg-accent text-accent-foreground",
    },
    {
      label: "En jornada ahora",
      value: clockedIn,
      hint: activeCount ? `${Math.round((clockedIn / activeCount) * 100)}% de activos` : "—",
      icon: UserCheck,
      tone: "bg-success-soft text-success",
    },
    {
      label: "Tardanzas hoy",
      value: late,
      hint: "Según horario y tolerancia aplicados",
      icon: AlarmClock,
      tone: "bg-warning-soft text-warning",
    },
    {
      label: "Inactivos",
      value: inactive,
      hint: "Cuentas deshabilitadas",
      icon: UserX,
      tone: "bg-destructive-soft text-destructive",
    },
  ]

  return (
    <section aria-label="Resumen ejecutivo" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {widgets.map(({ label, value, hint, icon: Icon, tone }) => (
        <Card key={label}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
