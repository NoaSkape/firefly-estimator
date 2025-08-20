import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext({ addToast: (_t) => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), [])

  const addToast = useCallback(({ message, type = 'info', duration = 4000, title }) => {
    const id = ++idRef.current
    setToasts(list => [...list, { id, message, type, title }])
    if (duration > 0) setTimeout(() => remove(id), duration)
  }, [remove])

  const value = useMemo(() => ({ addToast }), [addToast])

  const getToastStyles = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-600 text-red-100 shadow-red-500/20'
      case 'success':
        return 'bg-green-900/90 border-green-600 text-green-100 shadow-green-500/20'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-600 text-yellow-100 shadow-yellow-500/20'
      case 'info':
      default:
        return 'bg-blue-900/90 border-blue-600 text-blue-100 shadow-blue-500/20'
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-3 w-80">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`rounded-lg border px-4 py-3 shadow-lg text-sm transform transition-all duration-300 ease-out animate-in ${
              getToastStyles(t.type)
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{getIcon(t.type)}</span>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <div className="font-semibold mb-1">{t.title}</div>
                )}
                <div className="text-sm">{t.message}</div>
              </div>
              <button 
                onClick={() => remove(t.id)}
                className="text-gray-300 hover:text-white flex-shrink-0 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}


