import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext({ addToast: (_t) => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), [])

  const addToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = ++idRef.current
    setToasts(list => [...list, { id, message, type }])
    if (duration > 0) setTimeout(() => remove(id), duration)
  }, [remove])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-80">
        {toasts.map(t => (
          <div key={t.id} className={`rounded border px-4 py-3 shadow-lg text-sm ${
            t.type === 'error' ? 'bg-red-900/70 border-red-700 text-red-100' :
            t.type === 'success' ? 'bg-green-900/70 border-green-700 text-green-100' :
            'bg-gray-900/70 border-gray-700 text-gray-100'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}


