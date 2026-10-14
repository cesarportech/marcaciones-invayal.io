import { Card, CardContent } from "@/components/ui/card"
import { SHIFT_START, TIME_ZONE } from "@/lib/attendance"
import { cn } from "@/lib/utils"

const timeFormat = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: 'h23' })
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function LiveClock({ now, className, policy }: { now: Date | null; className?: string; policy?: { start_time: string; end_time: string; tolerance_minutes: number; workdays: number[] } }) {
  const seconds = now ? String(now.getSeconds()).padStart(2, "0") : "--"

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/8"
        aria-hidden="true"
      />
      <CardContent className="relative flex h-full flex-col justify-between gap-8 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Hora actual</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            En vivo
          </span>
        </div>
        <div>
          <p className="flex items-baseline gap-2 font-mono tabular-nums" aria-live="off">
            <span className="text-6xl font-semibold tracking-tight sm:text-7xl">
              {now ? timeFormat.format(now) : "--:--"}
            </span>
            <span className="text-2xl text-muted-foreground">{seconds}</span>
          </p>
          <p className="mt-2 text-base text-muted-foreground first-letter:uppercase">
            {now ? dateFormat.format(now) : "Cargando fecha…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-sm">
          <p>
            <span className="text-muted-foreground">Horario: </span>
            <span className="font-medium">{policy ? policy.workdays.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ') : 'Lun – Sáb'} · {policy?.start_time.slice(0,5) ?? SHIFT_START} – {policy?.end_time.slice(0,5) ?? '17:00'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Tolerancia: </span>
            <span className="font-medium">{policy?.tolerance_minutes ?? 10} min</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
