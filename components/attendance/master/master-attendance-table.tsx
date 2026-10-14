"use client"

import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarRange, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DEPARTMENTS,
  STATUS_LABELS,
  formatDisplayDate,
  formatDuration,
  getInitials,
  getStatus,
  getWorkedMinutes,
  parseISODate,
  toISODate,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
} from "@/lib/attendance"
import { exportToExcel, exportToPdf, type ExportRow } from "@/lib/export"
import { StatusBadge } from "../status-badge"

const PAGE_SIZE = 10

const departmentItems = [
  { label: "Todos los departamentos", value: "all" },
  ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
]

const statusItems = [
  { label: "Todos los estados", value: "all" },
  ...(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => ({ label: STATUS_LABELS[s], value: s })),
]

const shortDate = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" })

type MasterAttendanceTableProps = {
  employees: Employee[]
  records: AttendanceRecord[]
  todayISO: string
}

export function MasterAttendanceTable({ employees, records, todayISO }: MasterAttendanceTableProps) {
  const [query, setQuery] = useState("")
  const [department, setDepartment] = useState("all")
  const [status, setStatus] = useState("all")
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const to = parseISODate(todayISO)
    const from = new Date(to)
    from.setDate(to.getDate() - 6)
    return { from, to }
  })
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null)

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const fromISO = range?.from ? toISODate(range.from) : null
    const toISO = range?.to ? toISODate(range.to) : fromISO

    return records
      .map((record) => ({ record, employee: employeeById.get(record.employeeId), status: getStatus(record) }))
      .filter(({ record, employee, status: rowStatus }) => {
        if (!employee) return false
        if (normalized && !`${employee.fullName} ${employee.username}`.toLowerCase().includes(normalized)) return false
        if (department !== "all" && employee.department !== department) return false
        if (status !== "all" && rowStatus !== status) return false
        if (fromISO && record.date < fromISO) return false
        if (toISO && record.date > toISO) return false
        return true
      })
      .sort((a, b) => b.record.date.localeCompare(a.record.date) || a.employee!.fullName.localeCompare(b.employee!.fullName))
  }, [records, employeeById, query, department, status, range])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleRows = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const rangeLabel = range?.from
    ? range.to
      ? `${shortDate.format(range.from)} – ${shortDate.format(range.to)}`
      : shortDate.format(range.from)
    : "Todas las fechas"

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(0)
    }
  }

  async function handleExport(kind: "xlsx" | "pdf") {
    if (rows.length === 0) {
      toast.error("No hay registros para exportar con los filtros actuales.")
      return
    }
    const exportRows: ExportRow[] = rows.map(({ record, employee, status: rowStatus }) => ({
      fecha: record.date,
      empleado: employee!.fullName,
      departamento: employee!.department,
      entrada: record.clockIn ?? "—",
      salida: record.clockOut ?? "—",
      horas: formatDuration(getWorkedMinutes(record)),
      estado: STATUS_LABELS[rowStatus],
    }))
    const filename = `asistencia-${todayISO}`
    setExporting(kind)
    try {
      if (kind === "xlsx") await exportToExcel(exportRows, filename)
      else await exportToPdf(exportRows, filename, `Periodo: ${rangeLabel} · ${rows.length} registros`)
      toast.success(`Reporte ${kind === "xlsx" ? "Excel" : "PDF"} generado`)
    } catch {
      toast.error("No se pudo generar el archivo.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Registro maestro de asistencia</CardTitle>
          <CardDescription>
            {rows.length} {rows.length === 1 ? "registro" : "registros"} · {rangeLabel}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExport("xlsx")} disabled={exporting !== null}>
            <FileSpreadsheet className="text-success" aria-hidden="true" />
            {exporting === "xlsx" ? "Generando…" : "Exportar a Excel (.xlsx)"}
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")} disabled={exporting !== null}>
            <FileText className="text-destructive" aria-hidden="true" />
            {exporting === "pdf" ? "Generando…" : "Exportar a PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar empleado…"
              aria-label="Buscar empleado"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select
            items={departmentItems}
            value={department}
            onValueChange={(v) => resetPage(setDepartment)(v ?? "all")}
          >
            <SelectTrigger className="h-9 w-full xl:w-52" aria-label="Filtrar por departamento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departmentItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={statusItems} value={status} onValueChange={(v) => resetPage(setStatus)(v ?? "all")}>
            <SelectTrigger className="h-9 w-full xl:w-44" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" className="h-9 justify-start font-normal xl:w-52" />}
            >
              <CalendarRange aria-hidden="true" />
              {rangeLabel}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={range}
                onSelect={resetPage(setRange)}
                numberOfMonths={2}
                defaultMonth={range?.from}
                disabled={{ after: parseISODate(todayISO) }}
              />
              <div className="flex justify-end border-t p-2">
                <Button variant="ghost" size="sm" onClick={() => resetPage(setRange)(undefined)}>
                  Limpiar fechas
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    No se encontraron registros con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
              {visibleRows.map(({ record, employee, status: rowStatus }) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback className="text-[10px] font-semibold">
                          {getInitials(employee!.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <p className="font-medium">{employee!.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{employee!.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee!.department}</TableCell>
                  <TableCell className="capitalize">{formatDisplayDate(record.date)}</TableCell>
                  <TableCell className="font-mono tabular-nums">{record.clockIn ?? "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {record.clockOut ?? (record.clockIn ? <span className="font-sans text-warning">{record.date < todayISO ? 'Salida pendiente' : 'En curso'}</span> : "—")}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatDuration(getWorkedMinutes(record))}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={rowStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Página {currentPage + 1} de {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Página siguiente"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
