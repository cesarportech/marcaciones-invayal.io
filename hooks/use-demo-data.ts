"use client"

import { useEffect, useRef, useState } from 'react'
import { initialData, parseData, STORAGE_KEY, type DemoData } from '@/lib/demo-store'
import { businessDate } from '@/lib/attendance'

export function useDemoData() {
  const [data, setData] = useState<DemoData | null>(null)
  const current = useRef<DemoData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      current.current = raw ? parseData(raw) : initialData(businessDate(new Date()))
      setData(current.current)
    } catch {
      setError('No se pudieron cargar los datos locales. Habilita el almacenamiento del navegador o restablece la demostración.')
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      try {
        current.current = event.newValue ? parseData(event.newValue) : initialData(businessDate(new Date()))
        setData(current.current)
      } catch { setError('Los datos de otra pestaña no son válidos. Recarga la página.') }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function update(updater: (data: DemoData) => DemoData) {
    if (!current.current) throw new Error('Los datos todavía no están disponibles.')
    const raw = localStorage.getItem(STORAGE_KEY)
    const next = updater(raw ? parseData(raw) : current.current)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    current.current = next
    setData(next)
    setError('')
  }

  function reset() {
    try {
      const next = initialData(businessDate(new Date()))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      current.current = next
      setData(next)
      setError('')
    } catch { setError('El navegador no permite guardar datos. Revisa sus ajustes de almacenamiento.') }
  }
  return { data, update, reset, error }
}
