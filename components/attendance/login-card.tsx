"use client"

import { useState, type FormEvent } from "react"
import { Clock3, KeyRound, LockKeyhole, UserRound } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MASTER_CREDENTIALS, type Employee } from "@/lib/attendance"

export type LoginResult = { role: "master" } | { role: "employee"; employeeId: string }

type Method = "password" | "pin"

export function LoginCard({ employees, onLogin }: { employees: Employee[]; onLogin: (result: LoginResult) => void }) {
  const [method, setMethod] = useState<Method>("password")
  const [username, setUsername] = useState("")
  const [secret, setSecret] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = username.trim().toLowerCase()

    if (method === "password" && user === MASTER_CREDENTIALS.username && secret === MASTER_CREDENTIALS.password) {
      onLogin({ role: "master" })
      return
    }

    const employee = employees.find((e) => e.username === user && e.credential === secret)
    if (!employee) {
      setError("Credenciales incorrectas. Verifica tu usuario y contraseña o PIN.")
      return
    }
    if (!employee.active) {
      setError("Tu cuenta está inactiva. Contacta al administrador.")
      return
    }
    onLogin({ role: "employee", employeeId: employee.id })
  }

  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="items-center gap-3 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clock3 className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">INVAYAL · Marcaciones</CardTitle>
            <CardDescription>Inicia sesión para registrar tu asistencia</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Tabs
            value={method}
            onValueChange={(v) => {
              setMethod(v as Method)
              setSecret("")
              setError(null)
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="password" className="flex-1">
                <LockKeyhole aria-hidden="true" />
                Contraseña
              </TabsTrigger>
              <TabsTrigger value="pin" className="flex-1">
                <KeyRound aria-hidden="true" />
                PIN
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="ej. atorres"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 pl-9"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="secret">{method === "pin" ? "PIN de 4 a 6 dígitos" : "Contraseña"}</Label>
              <Input
                id="secret"
                type="password"
                autoComplete={method === "pin" ? "one-time-code" : "current-password"}
                inputMode={method === "pin" ? "numeric" : undefined}
                maxLength={method === "pin" ? 6 : undefined}
                placeholder={method === "pin" ? "••••" : "••••••••"}
                value={secret}
                onChange={(e) => setSecret(method === "pin" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                className={method === "pin" ? "h-10 text-center font-mono text-lg tracking-[0.5em]" : "h-10"}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="h-10 w-full">
              Ingresar
            </Button>
          </form>

          <div className="rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Credenciales de prueba</p>
            <p>
              Maestro: <span className="font-mono">admin / admin123</span>
            </p>
            <p>
              Empleado: <span className="font-mono">atorres / 1234</span> (PIN o contraseña)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
