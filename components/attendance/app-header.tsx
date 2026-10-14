import { Clock3, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/attendance"

export function AppHeader({
  name,
  roleLabel,
  onLogout,
}: {
  name: string
  roleLabel: string
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clock3 className="size-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Marcación</p>
            <p className="text-xs text-muted-foreground">Control de Asistencia</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Avatar>
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Cerrar sesión">
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  )
}
