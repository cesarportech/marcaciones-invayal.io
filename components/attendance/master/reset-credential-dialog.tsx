"use client"

import { useState, type FormEvent } from "react"
import { Dices } from "lucide-react"
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
import type { Employee } from "@/lib/attendance"

type ResetCredentialDialogProps = {
  employee: Employee | null
  onOpenChange: (open: boolean) => void
  onReset: (employee: Employee, credential: string) => void
}

function generatePin() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(values[0] % 10000).padStart(4, "0")
}

export function ResetCredentialDialog({ employee, onOpenChange, onReset }: ResetCredentialDialogProps) {
  const [credential, setCredential] = useState("")
  const [error, setError] = useState<string | null>(null)

  function close() {
    setCredential("")
    setError(null)
    onOpenChange(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employee) return
    if (credential.length < 4) {
      setError("La nueva credencial debe tener al menos 4 caracteres.")
      return
    }
    onReset(employee, credential)
    close()
  }

  return (
    <Dialog open={employee !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restablecer credencial</DialogTitle>
          <DialogDescription>
            Define una nueva contraseña o PIN para {employee?.fullName}.
          </DialogDescription>
        </DialogHeader>
        <form id="reset-credential" onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="reset-value">Nueva contraseña / PIN</Label>
          <div className="flex gap-2">
            <Input
              id="reset-value"
              value={credential}
              onChange={(e) => {
                setCredential(e.target.value)
                setError(null)
              }}
              className="font-mono"
              autoComplete="new-password"
              aria-invalid={Boolean(error)}
            />
            <Button type="button" variant="outline" onClick={() => setCredential(generatePin())}>
              <Dices aria-hidden="true" />
              Generar PIN
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">Comparte la nueva credencial con el empleado de forma segura.</p>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="reset-credential">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
