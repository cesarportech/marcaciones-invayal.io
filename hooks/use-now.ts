"use client"

import { useSyncExternalStore } from "react"

let current = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    current = Date.now()
    timer = setInterval(() => {
      current = Date.now()
      listeners.forEach((notify) => notify())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const getSnapshot = () => current
const getServerSnapshot = () => null

export function useNow() {
  const timestamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return timestamp === null ? null : new Date(timestamp)
}
