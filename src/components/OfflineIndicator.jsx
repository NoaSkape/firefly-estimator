import { useState, useEffect } from 'react'
import offlineQueue from '../utils/offlineQueue'
import { useToast } from './ToastProvider'

export default function OfflineIndicator() {
  const [status, setStatus] = useState(offlineQueue.getQueueStatus())
  const { addToast } = useToast()

  useEffect(() => {
    const updateStatus = () => {
      setStatus(offlineQueue.getQueueStatus())
    }

    const handleOnline = () => {
      updateStatus()
      addToast({
        type: 'success',
        title: 'Back Online',
        message: 'Connection restored. Syncing your changes...'
      })
    }

    const handleOffline = () => {
      updateStatus()
      addToast({
        type: 'warning',
        title: 'Offline Mode',
        message: 'You\'re offline. Changes will be saved locally and synced when you reconnect.'
      })
    }

    const handleOperationFailed = (event) => {
      const { operation, retries } = event.detail
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: `Failed to sync ${operation.type} after ${retries} attempts. Please try again.`
      })
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offlineOperationFailed', handleOperationFailed)

    // Update status periodically
    const interval = setInterval(updateStatus, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offlineOperationFailed', handleOperationFailed)
      clearInterval(interval)
    }
  }, [addToast])

  // Don't show anything if online and no queued operations
  if (status.isOnline && status.queueLength === 0) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium
        ${status.isOnline 
          ? 'bg-green-900/90 border border-green-600 text-green-100' 
          : 'bg-yellow-900/90 border border-yellow-600 text-yellow-100'
        }
      `}>
        <div className={`
          w-2 h-2 rounded-full
          ${status.isOnline ? 'bg-green-400' : 'bg-yellow-400'}
        `} />
        
        <span>
          {status.isOnline ? 'Online' : 'Offline'}
        </span>

        {status.queueLength > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs opacity-75">•</span>
            <span className="text-xs">
              {status.queueLength} pending
              {status.hasRetries && ' (retrying)'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
