import { Lock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatDisplayDate,
  formatDuration,
  getStatus,
  getWorkedMinutes,
  businessDate,
  type AttendanceRecord,
} from "@/lib/attendance"
import { StatusBadge } from "../status-badge"

export function PersonalHistory({ records }: { records: AttendanceRecord[] }) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const workedTotal = sorted.reduce((sum, r) => sum + (getWorkedMinutes(r) ?? 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Mi historial de asistencia</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden="true" />
            Solo puedes ver tus propios registros.
          </CardDescription>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Horas acumuladas</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{formatDuration(workedTotal)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Horas trabajadas</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aún no tienes registros.
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium capitalize">{formatDisplayDate(record.date)}</TableCell>
                  <TableCell className="font-mono tabular-nums">{record.clockIn ?? "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {record.clockOut ?? (record.clockIn ? <span className="font-sans text-warning">{record.date < businessDate(new Date()) ? 'Salida pendiente' : 'En curso'}</span> : "—")}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatDuration(getWorkedMinutes(record))}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={getStatus(record)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
