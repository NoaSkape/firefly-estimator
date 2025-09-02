import React, { useState, useRef, useEffect } from 'react'
import { 
  ArrowsUpDownIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

export default function VisualDragInterface({
  sections = [],
  onReorder,
  onSectionToggle,
  onSectionDelete,
  className = ''
}) {
  const [draggedSection, setDraggedSection] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  
  const containerRef = useRef(null)
  const sectionRefs = useRef([])
  const dragPreviewRef = useRef(null)

  // Initialize section refs
  useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, sections.length)
  }, [sections.length])

  // Drag and drop handlers
  const handleDragStart = (e, sectionId, index) => {
    setIsDragging(true)
    setDraggedSection(sectionId)
    setDragStartY(e.clientY)
    
    if (sectionRefs.current[index]) {
      const rect = sectionRefs.current[index].getBoundingClientRect()
      setDragOffsetY(e.clientY - rect.top)
    }
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', sectionId)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    setIsDragging(false)
    setDragOverIndex(null)
    
    if (draggedSection !== null) {
      const currentIndex = sections.findIndex(s => s === draggedSection)
      if (currentIndex !== -1 && currentIndex !== index) {
        const newSections = [...sections]
        const [movedSection] = newSections.splice(currentIndex, 1)
        newSections.splice(index, 0, movedSection)
        onReorder(newSections)
      }
    }
    
    setDraggedSection(null)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragOverIndex(null)
    setDraggedSection(null)
  }

  // Mouse drag handlers for better control
  const handleMouseDown = (e, sectionId, index) => {
    if (e.button !== 0) return // Only left click
    
    setIsDragging(true)
    setDraggedSection(sectionId)
    setDragStartY(e.clientY)
    
    if (sectionRefs.current[index]) {
      const rect = sectionRefs.current[index].getBoundingClientRect()
      setDragOffsetY(e.clientY - rect.top)
    }
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || draggedSection === null) return
    
    const currentY = e.clientY
    const deltaY = currentY - dragStartY
    setDragOffsetY(deltaY)
    
    // Find drop zone
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const relativeY = currentY - containerRect.top
      const itemHeight = containerRect.height / sections.length
      const newIndex = Math.max(0, Math.min(sections.length - 1, Math.floor(relativeY / itemHeight)))
      setDragOverIndex(newIndex)
    }
  }

  const handleMouseUp = () => {
    if (!isDragging || draggedSection === null) return
    
    setIsDragging(false)
    
    if (dragOverIndex !== null) {
      const currentIndex = sections.findIndex(s => s === draggedSection)
      if (currentIndex !== -1 && currentIndex !== dragOverIndex) {
        const newSections = [...sections]
        const [movedSection] = newSections.splice(currentIndex, 1)
        newSections.splice(dragOverIndex, 0, movedSection)
        onReorder(newSections)
      }
    }
    
    setDraggedSection(null)
    setDragOverIndex(null)
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
      className={`visual-drag-interface ${className}`}
      style={{ position: 'relative' }}
    >
      {/* Drop Zone Indicators */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          {sections.map((_, index) => (
            <div
              key={`drop-zone-${index}`}
              className={`
                absolute left-0 right-0 h-1 transition-all duration-200
                ${dragOverIndex === index ? 'bg-blue-400 opacity-100' : 'bg-transparent opacity-0'}
              `}
              style={{
                top: index === 0 ? 0 : `${(index / sections.length) * 100}%`
              }}
            />
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((sectionId, index) => (
          <div
            key={sectionId}
            ref={el => sectionRefs.current[index] = el}
            draggable
            onDragStart={(e) => handleDragStart(e, sectionId, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              group relative bg-white dark:bg-gray-800 border-2 rounded-lg p-4 transition-all duration-200
              ${isDragging && draggedSection === sectionId ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
              hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
            `}
          >
            {/* Drag Handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowsUpDownIcon className="w-5 h-5 text-gray-400 cursor-move" />
            </div>
            
            {/* Mouse Drag Handler */}
            <div
              className="absolute inset-0 cursor-move"
              onMouseDown={(e) => handleMouseDown(e, sectionId, index)}
            />
            
            {/* Section Content */}
            <div className="pl-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {getSectionDisplayName(sectionId)}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getSectionDescription(sectionId)}
                  </p>
                </div>
                
                {/* Section Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSectionToggle(sectionId)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Toggle Section"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onSectionDelete(sectionId)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Section"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drag Preview */}
      {isDragging && draggedSection && (
        <div
          ref={dragPreviewRef}
          className="fixed pointer-events-none z-50 opacity-80 transform rotate-2"
          style={{
            top: dragStartY - dragOffsetY,
            left: containerRef.current?.getBoundingClientRect().left || 0,
            width: containerRef.current?.offsetWidth || 'auto'
          }}
        >
          <div className="bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-lg p-4 shadow-2xl">
            <div className="pl-8">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {getSectionDisplayName(draggedSection)}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getSectionDescription(draggedSection)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Button */}
      <div className="mt-4">
        <button
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add New Section</span>
        </button>
      </div>
    </div>
  )
}

// Helper functions
const getSectionDisplayName = (sectionId) => {
  const names = {
    hero: 'Hero Section',
    title: 'Title & Headline',
    excerpt: 'Excerpt/Summary',
    featuredImage: 'Featured Image',
    content: 'Main Content',
    author: 'Author Info',
    readingStats: 'Reading Statistics',
    socialShare: 'Social Sharing',
    quickActions: 'Quick Actions',
    relatedPosts: 'Related Posts',
    callToAction: 'Call to Action',
    testimonials: 'Testimonials',
    gallery: 'Image Gallery',
    video: 'Video Embed',
    quote: 'Pull Quote',
    tableOfContents: 'Table of Contents',
    progressIndicator: 'Progress Bar',
    navigation: 'Navigation',
    footer: 'Footer'
  }
  return names[sectionId] || sectionId
}

const getSectionDescription = (sectionId) => {
  const descriptions = {
    hero: 'Full-width hero section with background image and title overlay',
    title: 'Main post title and subtitle display',
    excerpt: 'Brief summary or teaser text for the post',
    featuredImage: 'Primary image displayed prominently',
    content: 'Main article content and body text',
    author: 'Author information and bio',
    readingStats: 'Reading time, publish date, and category info',
    socialShare: 'Social media sharing buttons',
    quickActions: 'Like, bookmark, and comment buttons',
    relatedPosts: 'Links to related articles and posts',
    callToAction: 'Engagement prompts and action buttons',
    testimonials: 'Customer or reader testimonials',
    gallery: 'Collection of related images',
    video: 'Embedded video content',
    quote: 'Highlighted quote or key message',
    tableOfContents: 'Navigation for long-form content',
    progressIndicator: 'Reading progress visualization',
    navigation: 'Post navigation and breadcrumbs',
    footer: 'Post footer and additional links'
  }
  return descriptions[sectionId] || 'Additional content section'
}
