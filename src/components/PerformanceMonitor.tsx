import { useEffect } from 'react'

export default function PerformanceMonitor() {
  useEffect(() => {
    // Monitor page load performance using built-in APIs
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            console.log('Page Load Performance:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart
            })
          }
        }
      })
      
      observer.observe({ entryTypes: ['navigation'] })
      
      return () => observer.disconnect()
    }

    // Monitor resource loading
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.duration > 1000) { // Log slow resources (>1s)
              console.warn('Slow resource loaded:', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize
              })
            }
          }
        }
      })
      
      observer.observe({ entryTypes: ['resource'] })
      
      return () => observer.disconnect()
    }

    // Monitor Core Web Vitals manually
    if ('performance' in window) {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('LCP:', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any
          if (fidEntry.processingStart && fidEntry.startTime) {
            console.log('FID:', fidEntry.processingStart - fidEntry.startTime)
          }
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as any
          if (clsEntry.hadRecentInput === false) {
            clsValue += clsEntry.value || 0
            console.log('CLS:', clsValue)
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      return () => {
        lcpObserver.disconnect()
        fidObserver.disconnect()
        clsObserver.disconnect()
      }
    }
  }, [])
  
  return null
}
