'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

let _listeners: ((toast: ToastMessage) => void)[] = []

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = { id: Math.random().toString(36).slice(2), message, type }
  _listeners.forEach((fn) => fn(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 3500)
    }
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter((fn) => fn !== handler) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-xs w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 ${
            toast.type === 'success' ? 'bg-[var(--m-green)] text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-gray-900 text-white'
          }`}
        >
          {toast.type === 'success' && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          )}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
