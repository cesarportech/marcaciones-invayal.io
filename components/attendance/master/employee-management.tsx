"use client"

import { useState } from "react"
import { KeyRound, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getInitials, type Employee } from "@/lib/attendance"
import { CreateEmployeeDialog } from "./create-employee-dialog"
import { ResetCredentialDialog } from "./reset-credential-dialog"

type EmployeeManagementProps = {
  employees: Employee[]
  onEmployeesChange: (updater: (prev: Employee[]) => Employee[]) => void
}

export function EmployeeManagement({ employees, onEmployeesChange }: EmployeeManagementProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<Employee | null>(null)
  const [query, setQuery] = useState("")

  const normalized = query.trim().toLowerCase()
  const filtered = employees.filter((e) =>
    `${e.fullName} ${e.username} ${e.department}`.toLowerCase().includes(normalized),
  )

  function handleCreate(employee: Employee) {
    onEmployeesChange((prev) => [...prev, employee])
    toast.success(`Cuenta creada para ${employee.fullName}`)
  }

  function handleToggle(employee: Employee, active: boolean) {
    onEmployeesChange((prev) => prev.map((e) => (e.id === employee.id ? { ...e, active } : e)))
    toast(`${employee.fullName} ahora está ${active ? "activo" : "inactivo"}`)
  }

  function handleReset(employee: Employee, credential: string) {
    onEmployeesChange((prev) => prev.map((e) => (e.id === employee.id ? { ...e, credential } : e)))
    toast.success(`Credencial restablecida para ${employee.fullName}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Gestión de empleados y credenciales</CardTitle>
          <CardDescription>Crea cuentas, restablece contraseñas y controla el acceso.</CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus aria-hidden="true" />
          Nuevo empleado
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar cuenta…"
            aria-label="Buscar cuenta"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Credencial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No se encontraron cuentas.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback className="text-[10px] font-semibold">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                  <TableCell className="font-mono text-sm">@{employee.username}</TableCell>
                  <TableCell className="font-mono tracking-widest text-muted-foreground" aria-label="Credencial oculta">
                    {"•".repeat(Math.min(Math.max(employee.credential.length, 4), 8))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={employee.active}
                        onCheckedChange={(checked) => handleToggle(employee, checked)}
                        aria-label={`Estado de ${employee.fullName}`}
                      />
                      <span className={employee.active ? "text-sm text-success" : "text-sm text-muted-foreground"}>
                        {employee.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setResetTarget(employee)}>
                      <KeyRound aria-hidden="true" />
                      Restablecer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingUsernames={employees.map((e) => e.username)}
        onCreate={handleCreate}
      />
      <ResetCredentialDialog
        employee={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onReset={handleReset}
      />
    </Card>
  )
}
