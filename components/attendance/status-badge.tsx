import { cn } from "@/lib/utils"
import { STATUS_LABELS, type AttendanceStatus } from "@/lib/attendance"

const STYLES: Record<AttendanceStatus, string> = {
  "on-time": "bg-success-soft text-success",
  late: "bg-warning-soft text-warning",
  absent: "bg-destructive-soft text-destructive",
}

const DOTS: Record<AttendanceStatus, string> = {
  "on-time": "bg-success",
  late: "bg-warning",
  absent: "bg-destructive",
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[status])} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
