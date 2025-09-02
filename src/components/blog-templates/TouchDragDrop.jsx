import React, { useState, useRef, useEffect } from 'react'
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline'

export default function TouchDragDrop({ 
  children, 
  onReorder, 
  items = [], 
  className = '' 
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchStartIndex, setTouchStartIndex] = useState(null)
  
  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const dragPreviewRef = useRef(null)

  // Initialize item refs
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  // Touch event handlers
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchStartIndex(index)
    setDragIndex(index)
    setIsDragging(true)
    
    // Create drag preview
    if (itemRefs.current[index]) {
      const rect = itemRefs.current[index].getBoundingClientRect()
      setDragOffsetY(touch.clientY - rect.top)
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || dragIndex === null) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const currentY = touch.clientY
    const deltaY = currentY - touchStartY
    
    // Update drag preview position
    setDragOffsetY(deltaY)
    
    // Find new position
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const relativeY = currentY - containerRect.top
      const itemHeight = containerRect.height / items.length
      const newIndex = Math.max(0, Math.min(items.length - 1, Math.floor(relativeY / itemHeight)))
      
      if (newIndex !== dragIndex) {
        setDragIndex(newIndex)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || dragIndex === null || touchStartIndex === null) return
    
    setIsDragging(false)
    
    // Reorder if position changed
    if (dragIndex !== touchStartIndex) {
      const newItems = [...items]
      const [movedItem] = newItems.splice(touchStartIndex, 1)
      newItems.splice(dragIndex, 0, movedItem)
      onReorder(newItems)
    }
    
    // Reset state
    setDragIndex(null)
    setTouchStartIndex(null)
    setDragOffsetY(0)
  }

  // Mouse event handlers for desktop
  const handleMouseDown = (e, index) => {
    if (e.button !== 0) return // Only left click
    
    setTouchStartY(e.clientY)
    setTouchStartIndex(index)
    setDragIndex(index)
    setIsDragging(true)
    
    if (itemRefs.current[index]) {
      const rect = itemRefs.current[index].getBoundingClientRect()
      setDragOffsetY(e.clientY - rect.top)
    }
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || dragIndex === null) return
    
    const currentY = e.clientY
    const deltaY = currentY - touchStartY
    
    setDragOffsetY(deltaY)
    
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const relativeY = currentY - containerRect.top
      const itemHeight = containerRect.height / items.length
      const newIndex = Math.max(0, Math.min(items.length - 1, Math.floor(relativeY / itemHeight)))
      
      if (newIndex !== dragIndex) {
        setDragIndex(newIndex)
      }
    }
  }

  const handleMouseUp = () => {
    if (!isDragging || dragIndex === null || touchStartIndex === null) return
    
    setIsDragging(false)
    
    if (dragIndex !== touchStartIndex) {
      const newItems = [...items]
      const [movedItem] = newItems.splice(touchStartIndex, 1)
      newItems.splice(dragIndex, 0, movedItem)
      onReorder(newItems)
    }
    
    setDragIndex(null)
    setTouchStartIndex(null)
    setDragOffsetY(0)
    
    // Remove global listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`touch-drag-drop ${className}`}
      style={{ position: 'relative' }}
    >
      {items.map((item, index) => (
        <div
          key={item.id || index}
          ref={el => itemRefs.current[index] = el}
          className={`
            touch-drag-item relative transition-all duration-200
            ${isDragging && dragIndex === index ? 'opacity-50' : ''}
            ${isDragging && touchStartIndex === index ? 'z-10' : ''}
          `}
          style={{
            transform: isDragging && touchStartIndex === index 
              ? `translateY(${dragOffsetY}px)` 
              : 'none'
          }}
        >
          {/* Drag Handle */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
          </div>
          
          {/* Touch/Mouse Event Handlers */}
          <div
            className="absolute inset-0 cursor-move"
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => handleMouseDown(e, index)}
          />
          
          {/* Item Content */}
          <div className="pl-8">
            {children(item, index)}
          </div>
        </div>
      ))}
      
      {/* Drag Preview */}
      {isDragging && touchStartIndex !== null && (
        <div
          ref={dragPreviewRef}
          className="fixed pointer-events-none z-50 opacity-80"
          style={{
            top: touchStartY - dragOffsetY,
            left: itemRefs.current[touchStartIndex]?.getBoundingClientRect().left || 0,
            width: itemRefs.current[touchStartIndex]?.offsetWidth || 'auto'
          }}
        >
          {children(items[touchStartIndex], touchStartIndex)}
        </div>
      )}
    </div>
  )
}

// Hook for touch drag and drop
export const useTouchDragDrop = (items, onReorder) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchStartIndex, setTouchStartIndex] = useState(null)

  const handleTouchStart = (e, index) => {
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchStartIndex(index)
    setDragIndex(index)
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || dragIndex === null) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStartY
    setDragOffsetY(deltaY)
  }

  const handleTouchEnd = () => {
    if (!isDragging || dragIndex === null || touchStartIndex === null) return
    
    setIsDragging(false)
    
    if (dragIndex !== touchStartIndex) {
      const newItems = [...items]
      const [movedItem] = newItems.splice(touchStartIndex, 1)
      newItems.splice(dragIndex, 0, movedItem)
      onReorder(newItems)
    }
    
    setDragIndex(null)
    setTouchStartIndex(null)
    setDragOffsetY(0)
  }

  return {
    isDragging,
    dragIndex,
    dragOffsetY,
    touchStartIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}
