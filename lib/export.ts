export type ExportRow = {
  fecha: string
  empleado: string
  departamento: string
  entrada: string
  salida: string
  horas: string
  estado: string
}

const HEADERS: { key: keyof ExportRow; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "empleado", label: "Empleado" },
  { key: "departamento", label: "Departamento" },
  { key: "entrada", label: "Entrada" },
  { key: "salida", label: "Salida" },
  { key: "horas", label: "Horas trabajadas" },
  { key: "estado", label: "Estado" },
]

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportToExcel(rows: ExportRow[], filename: string) {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Asistencia")
  sheet.columns = HEADERS.map((h) => ({ header: h.label, key: h.key, width: h.key === "empleado" ? 28 : 18 }))
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E6B73" } }
  rows.forEach((row) => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filename}.xlsx`,
  )
}

export async function exportToPdf(rows: ExportRow[], filename: string, subtitle: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(16)
  doc.text("Reporte de Asistencia", 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(subtitle, 14, 25)
  autoTable(doc, {
    startY: 31,
    head: [HEADERS.map((h) => h.label)],
    body: rows.map((row) => HEADERS.map((h) => row[h.key])),
    headStyles: { fillColor: [14, 107, 115] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [246, 248, 250] },
  })
  doc.save(`${filename}.pdf`)
}
