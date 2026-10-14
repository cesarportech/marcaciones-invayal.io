"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DEPARTMENTS, type Department, type Employee } from "@/lib/attendance"

type CreateEmployeeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingUsernames: string[]
  onCreate: (employee: Employee) => void
}

const EMPTY = { fullName: "", department: "" as Department | "", username: "", credential: "", active: true }

export function CreateEmployeeDialog({ open, onOpenChange, existingUsernames, onCreate }: CreateEmployeeDialogProps) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({})

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setForm(EMPTY)
      setErrors({})
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = form.username.trim().toLowerCase()
    const nextErrors: typeof errors = {}
    if (form.fullName.trim().length < 3) nextErrors.fullName = "Ingresa el nombre completo."
    if (!form.department) nextErrors.department = "Selecciona un departamento."
    if (!/^[a-z0-9._]{3,20}$/.test(username))
      nextErrors.username = "3–20 caracteres: letras minúsculas, números, punto o guion bajo."
    else if (username === "admin" || existingUsernames.includes(username)) nextErrors.username = "Este usuario ya existe o está reservado."
    if (form.credential.length < 4) nextErrors.credential = "Mínimo 4 caracteres."

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onCreate({
      id: crypto.randomUUID(),
      fullName: form.fullName.trim(),
      department: form.department as Department,
      username,
      credential: form.credential,
      active: form.active,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo empleado</DialogTitle>
          <DialogDescription>Crea las credenciales de acceso para marcar asistencia.</DialogDescription>
        </DialogHeader>
        <form id="create-employee" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field id="fullName" label="Nombre completo" error={errors.fullName}>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="ej. Andrea Gómez"
              aria-invalid={Boolean(errors.fullName)}
            />
          </Field>
          <Field id="department" label="Departamento" error={errors.department}>
            <Select value={form.department || null} onValueChange={(v) => update("department", (v ?? "") as Department)}>
              <SelectTrigger id="department" className="w-full" aria-invalid={Boolean(errors.department)}>
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-username" label="Usuario" error={errors.username}>
              <Input
                id="new-username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="ej. agomez"
                autoComplete="off"
                aria-invalid={Boolean(errors.username)}
              />
            </Field>
            <Field id="new-credential" label="Contraseña / PIN" error={errors.credential}>
              <Input
                id="new-credential"
                type="password"
                value={form.credential}
                onChange={(e) => update("credential", e.target.value)}
                placeholder="••••"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.credential)}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="new-active">Cuenta activa</Label>
              <p className="text-xs text-muted-foreground">Permite iniciar sesión y marcar asistencia.</p>
            </div>
            <Switch id="new-active" checked={form.active} onCheckedChange={(v) => update("active", v)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="create-employee">
            Crear cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
