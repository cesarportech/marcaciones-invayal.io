"use client"

import { CalendarOff, LogIn, ShieldCheck, UserRound } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type DemoView = "login" | "employee" | "master" | "sunday"

const OPTIONS: { value: DemoView; label: string; icon: typeof LogIn }[] = [
  { value: "login", label: "Inicio de sesión", icon: LogIn },
  { value: "employee", label: "Ver como Empleado", icon: UserRound },
  { value: "master", label: "Ver como Maestro", icon: ShieldCheck },
  { value: "sunday", label: "Ver Vista Domingo", icon: CalendarOff },
]

export function DemoSwitcher({ value, onChange }: { value: DemoView; onChange: (view: DemoView) => void }) {
  return (
    <div className="border-b bg-foreground text-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs font-medium tracking-wide text-background/70 uppercase">Modo demostración</p>
        <Tabs value={value} onValueChange={(v) => onChange(v as DemoView)}>
          <TabsList className="h-auto flex-wrap bg-background/10 p-1" aria-label="Cambiar vista de demostración">
            {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => (
              <TabsTrigger
                key={optionValue}
                value={optionValue}
                className="gap-1.5 px-3 text-background/75 hover:text-background data-active:bg-background data-active:text-foreground"
              >
                <Icon aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
