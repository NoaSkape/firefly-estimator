import React, { useState, useRef, useCallback } from 'react'
import { 
  ArrowsUpDownIcon,
  TrashIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { TEMPLATE_REGISTRY, getTemplate } from './TemplateRegistry'

export default function DragDropSectionManager({
  templateId,
  activeSections = [],
  onSectionsChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionId, setNewSectionId] = useState('')
  const [selectedSections, setSelectedSections] = useState(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [dragStartIndex, setDragStartIndex] = useState(null)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false)
  
  const dragItemRef = useRef(null)
  const dragOverItemRef = useRef(null)

  const template = getTemplate(templateId)
  if (!template) return null

  // All available sections
  const allAvailableSections = [
    'hero', 'title', 'excerpt', 'featuredImage', 'content', 'author', 
    'readingStats', 'socialShare', 'quickActions', 'relatedPosts',
    'callToAction', 'testimonials', 'gallery', 'video', 'quote',
    'tableOfContents', 'progressIndicator', 'navigation', 'footer'
  ]
  
  const availableSections = allAvailableSections.filter(sectionId => !activeSections.includes(sectionId))

  // Save state to history
  const saveToHistory = useCallback((newSections) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newSections])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Undo/Redo functions
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onSectionsChange(history[newIndex])
    }
  }

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onSectionsChange(history[newIndex])
    }
  }

  // Multi-selection functions
  const toggleSectionSelection = (sectionId) => {
    const newSelection = new Set(selectedSections)
    if (newSelection.has(sectionId)) {
      newSelection.delete(sectionId)
    } else {
      newSelection.add(sectionId)
    }
    setSelectedSections(newSelection)
    setShowSelectionToolbar(newSelection.size > 0)
  }

  const selectAll = () => {
    setSelectedSections(new Set(activeSections))
    setShowSelectionToolbar(true)
  }

  const clearSelection = () => {
    setSelectedSections(new Set())
    setShowSelectionToolbar(false)
  }

  const deleteSelectedSections = () => {
    const newSections = activeSections.filter(section => !selectedSections.has(section))
    saveToHistory(newSections)
    onSectionsChange(newSections)
    clearSelection()
  }

  const duplicateSelectedSections = () => {
    const sectionsToDuplicate = activeSections.filter(section => selectedSections.has(section))
    const newSections = [...activeSections, ...sectionsToDuplicate]
    saveToHistory(newSections)
    onSectionsChange(newSections)
    clearSelection()
  }

  // Drag and Drop functions
  const handleDragStart = (e, index) => {
    setIsDragging(true)
    setDragStartIndex(index)
    dragItemRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
    dragOverItemRef.current = index
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    setIsDragging(false)
    setDragOverIndex(null)
    
    if (dragItemRef.current !== null && dragItemRef.current !== index) {
      const newSections = [...activeSections]
      const draggedSection = newSections[dragItemRef.current]
      newSections.splice(dragItemRef.current, 1)
      newSections.splice(index, 0, draggedSection)
      
      saveToHistory(newSections)
      onSectionsChange(newSections)
    }
    
    dragItemRef.current = null
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragOverIndex(null)
    dragItemRef.current = null
  }

  // Section management functions
  const handleSectionToggle = (sectionId) => {
    const newSections = activeSections.includes(sectionId)
      ? activeSections.filter(id => id !== sectionId)
      : [...activeSections, sectionId]
    
    saveToHistory(newSections)
    onSectionsChange(newSections)
  }

  const handleAddSection = () => {
    if (newSectionId && !activeSections.includes(newSectionId)) {
      const newSections = [...activeSections, newSectionId]
      saveToHistory(newSections)
      onSectionsChange(newSections)
      setNewSectionId('')
      setShowAddSection(false)
    }
  }

  const handleRemoveSection = (sectionId) => {
    if (!template.requiredSections.includes(sectionId)) {
      const newSections = activeSections.filter(id => id !== sectionId)
      saveToHistory(newSections)
      onSectionsChange(newSections)
    }
  }

  const handleMoveSection = (fromIndex, toIndex) => {
    if (fromIndex !== toIndex) {
      const newSections = [...activeSections]
      const [movedSection] = newSections.splice(fromIndex, 1)
      newSections.splice(toIndex, 0, movedSection)
      
      saveToHistory(newSections)
      onSectionsChange(newSections)
    }
  }

  // Helper functions
  const isRequired = (sectionId) => template.requiredSections.includes(sectionId)
  
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

  return (
    <div className={`drag-drop-section-manager ${className}`}>
      {/* Selection Toolbar */}
      {showSelectionToolbar && (
        <div className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedSections.size} section{selectedSections.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={duplicateSelectedSections}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              Duplicate
            </button>
            
            <button
              onClick={deleteSelectedSections}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Section Manager */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Template Sections
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activeSections.length} of {template.maxSections} sections
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-2 rounded-md transition-colors ${
                  canUndo 
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100' 
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Undo"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-2 rounded-md transition-colors ${
                  canRedo 
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100' 
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Redo"
              >
                <ArrowUturnRightIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Selection Controls */}
            <button
              onClick={selectAll}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Select All"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            
            {/* Toggle Panel */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              {isOpen ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        {isOpen && (
          <div className="p-4 space-y-4">
            {/* Active Sections */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Active Sections (Drag to reorder)
              </h4>
              
              <div className="space-y-2">
                {activeSections.map((sectionId, index) => (
                  <div
                    key={sectionId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      group relative flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 transition-all duration-200 cursor-move
                      ${dragOverIndex === index ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent'}
                      ${selectedSections.has(sectionId) ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}
                      hover:border-gray-300 dark:hover:border-gray-600
                    `}
                  >
                    {/* Drag Handle */}
                    <div className="flex-shrink-0">
                      <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    </div>
                    
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedSections.has(sectionId)}
                      onChange={() => toggleSectionSelection(sectionId)}
                      className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    
                    {/* Section Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {getSectionDisplayName(sectionId)}
                        </span>
                        {isRequired(sectionId) && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {getSectionDescription(sectionId)}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Move Up */}
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveSection(index, index - 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUturnLeftIcon className="w-3 h-3 rotate-90" />
                        </button>
                      )}
                      
                      {/* Move Down */}
                      {index < activeSections.length - 1 && (
                        <button
                          onClick={() => handleMoveSection(index, index + 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Move Down"
                        >
                          <ArrowUturnLeftIcon className="w-3 h-3 -rotate-90" />
                        </button>
                      )}
                      
                      {/* Remove */}
                      {!isRequired(sectionId) && (
                        <button
                          onClick={() => handleRemoveSection(sectionId)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove Section"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Add New Section
              </h4>
              
              {showAddSection ? (
                <div className="flex gap-2">
                  <select
                    value={newSectionId}
                    onChange={(e) => setNewSectionId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a section...</option>
                    {availableSections.map(sectionId => (
                      <option key={sectionId} value={sectionId}>
                        {getSectionDisplayName(sectionId)}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleAddSection}
                    disabled={!newSectionId}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAddSection(false)
                      setNewSectionId('')
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Section
                </button>
              )}
            </div>

            {/* Section Limits Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p><strong>Template Limits:</strong> {template.maxSections} maximum sections</p>
              <p><strong>Required Sections:</strong> {template.requiredSections.join(', ')}</p>
              <p><strong>Current Usage:</strong> {activeSections.length} sections active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
