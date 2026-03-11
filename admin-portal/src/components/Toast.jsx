import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

/**
 * Parse API error responses into a clean, readable message.
 * Handles: strings, { detail: "..." }, { field: ["msg"] }, nested objects, etc.
 */
export function parseApiError(err, fallback = 'Something went wrong') {
  const data = err?.response?.data
  if (!data) return fallback

  // Simple string
  if (typeof data === 'string') return data

  // { detail: "message" }
  if (data.detail && typeof data.detail === 'string') return data.detail

  // { field: ["error msg"], field2: ["error msg"] }
  if (typeof data === 'object') {
    const messages = []
    for (const [key, value] of Object.entries(data)) {
      const msg = Array.isArray(value) ? value.join(', ') : String(value)
      // Skip generic keys like "detail" or "non_field_errors"
      if (key === 'non_field_errors' || key === 'detail') {
        messages.push(msg)
      } else {
        // Convert field_name to "Field name"
        const label = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
        messages.push(`${label}: ${msg}`)
      }
    }
    if (messages.length > 0) return messages.join('\n')
  }

  return fallback
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const toast = {
    error: (msg) => addToast(msg, 'error'),
    success: (msg) => addToast(msg, 'success'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium animate-slide-in cursor-pointer whitespace-pre-line ${
              t.type === 'error'
                ? 'bg-[#fdecea] text-[#c0392b] border-[#f5c6cb]'
                : t.type === 'success'
                ? 'bg-[#e8f5ee] text-[#1a6b4a] border-[#c3e6cb]'
                : 'bg-[#e8f0fc] text-[#2563a8] border-[#b8daff]'
            }`}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
