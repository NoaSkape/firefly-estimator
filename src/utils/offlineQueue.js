// Enhanced offline queue management
class OfflineQueue {
  constructor() {
    this.queue = []
    this.isOnline = navigator.onLine
    this.retryInterval = null
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
    
    this.setupEventListeners()
    this.loadQueueFromStorage()
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.stopRetryInterval()
    })
  }

  loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('ff_offline_queue')
      if (stored) {
        this.queue = JSON.parse(stored)
        console.log(`📱 Loaded ${this.queue.length} queued operations from storage`)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  saveQueueToStorage() {
    try {
      localStorage.setItem('ff_offline_queue', JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  addToQueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random(),
      operation,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: this.maxRetries
    }

    this.queue.push(queueItem)
    this.saveQueueToStorage()
    
    console.log(`📱 Added operation to offline queue: ${operation.type}`)
    
    if (this.isOnline) {
      this.processQueue()
    }
  }

  async processQueue() {
    if (!this.isOnline || this.queue.length === 0) {
      return
    }

    console.log(`📱 Processing ${this.queue.length} queued operations...`)

    const itemsToProcess = [...this.queue]
    this.queue = []

    for (const item of itemsToProcess) {
      try {
        await this.executeOperation(item.operation)
        console.log(`✅ Successfully processed queued operation: ${item.operation.type}`)
      } catch (error) {
        console.error(`❌ Failed to process queued operation: ${item.operation.type}`, error)
        
        // Retry logic
        if (item.retries < item.maxRetries) {
          item.retries++
          this.queue.push(item)
          console.log(`🔄 Queued for retry (${item.retries}/${item.maxRetries}): ${item.operation.type}`)
        } else {
          console.error(`💥 Max retries exceeded for operation: ${item.operation.type}`)
          this.notifyFailedOperation(item)
        }
      }
    }

    this.saveQueueToStorage()
    
    if (this.queue.length > 0) {
      this.startRetryInterval()
    }
  }

  async executeOperation(operation) {
    const { type, url, options, buildId } = operation

    switch (type) {
      case 'PATCH_BUILD':
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: JSON.stringify(options.body)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()

      case 'POST_BUILD':
        const postResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: JSON.stringify(options.body)
        })

        if (!postResponse.ok) {
          throw new Error(`HTTP ${postResponse.status}: ${postResponse.statusText}`)
        }

        return await postResponse.json()

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  startRetryInterval() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
    }

    this.retryInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue()
      }
    }, this.retryDelay)
  }

  stopRetryInterval() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
    }
  }

  notifyFailedOperation(item) {
    // Dispatch custom event for failed operations
    const event = new CustomEvent('offlineOperationFailed', {
      detail: {
        operation: item.operation,
        timestamp: item.timestamp,
        retries: item.retries
      }
    })
    window.dispatchEvent(event)
  }

  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      hasRetries: this.queue.some(item => item.retries > 0)
    }
  }

  clearQueue() {
    this.queue = []
    this.saveQueueToStorage()
    console.log('📱 Cleared offline queue')
  }

  // Utility methods for common operations
  queueBuildUpdate(buildId, patch, token) {
    this.addToQueue({
      type: 'PATCH_BUILD',
      url: `/api/builds/${buildId}`,
      options: {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: patch
      },
      buildId
    })
  }

  queueBuildCreate(buildData, token) {
    this.addToQueue({
      type: 'POST_BUILD',
      url: '/api/builds',
      options: {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: buildData
      }
    })
  }
}

// Create singleton instance
const offlineQueue = new OfflineQueue()

export default offlineQueue
