'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration: number
}

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  error: 6000, // errors stay longer so users can read them
}

let _listeners: ((toast: ToastMessage) => void)[] = []

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = {
    id: Math.random().toString(36).slice(2),
    message,
    type,
    duration: DURATIONS[type],
  }
  _listeners.forEach((fn) => fn(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, toast.duration)
    }
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter((fn) => fn !== handler) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-6 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:bottom-6 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg cursor-pointer ${
              toast.type === 'success' ? 'bg-[var(--m-green)] text-white' :
              toast.type === 'error'   ? 'bg-red-600 text-white' :
                                         'bg-gray-900 text-white'
            }`}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            {toast.type === 'success' && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
            )}
            <span className="flex-1">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
