"use client"

import { ClipboardList, KeySquare } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AttendanceRecord, Employee } from "@/lib/attendance"
import { OverviewWidgets } from "./overview-widgets"
import { MasterAttendanceTable } from "./master-attendance-table"
import { EmployeeManagement } from "./employee-management"

type MasterViewProps = {
  employees: Employee[]
  records: AttendanceRecord[]
  todayISO: string
  onEmployeesChange: (updater: (prev: Employee[]) => Employee[]) => void
}

export function MasterView({ employees, records, todayISO, onEmployeesChange }: MasterViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Panel de control</h1>
        <p className="text-sm text-muted-foreground">Visión general de la asistencia de toda la organización.</p>
      </div>

      <OverviewWidgets employees={employees} records={records} todayISO={todayISO} />

      <Tabs defaultValue="attendance" className="gap-4">
        <TabsList>
          <TabsTrigger value="attendance">
            <ClipboardList aria-hidden="true" />
            Registro de asistencia
          </TabsTrigger>
          <TabsTrigger value="employees">
            <KeySquare aria-hidden="true" />
            Empleados y credenciales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <MasterAttendanceTable employees={employees} records={records} todayISO={todayISO} />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeeManagement employees={employees} onEmployeesChange={onEmployeesChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
