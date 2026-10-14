import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'


export const metadata: Metadata = {
  title: 'INVAYAL · Control de asistencia',
  description: 'Sistema de marcación de asistencia de empleados con vistas por rol, reportes y gestión de credenciales.',
}

export const viewport: Viewport = {
  themeColor: '#0e6b73',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
