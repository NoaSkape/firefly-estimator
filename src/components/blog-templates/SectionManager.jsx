import React, { useState } from 'react'
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { TEMPLATE_REGISTRY, getTemplate } from './TemplateRegistry'

export default function SectionManager({ 
  templateId, 
  activeSections = [], 
  onSectionsChange,
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionId, setNewSectionId] = useState('')
  
  const template = getTemplate(templateId)
  if (!template) return null
  
  // Get all available sections for this template
  const allAvailableSections = [
    'hero',
    'title',
    'excerpt',
    'featuredImage',
    'content',
    'author',
    'socialShare',
    'relatedPosts',
    'tableOfContents',
    'quickTips',
    'resources',
    'checklist',
    'gallery',
    'testimonials',
    'callToAction'
  ]
  
  // Get sections that are not currently active
  const availableSections = allAvailableSections.filter(
    sectionId => !activeSections.includes(sectionId)
  )
  
  // Handle section toggle
  const handleSectionToggle = (sectionId) => {
    const newSections = activeSections.includes(sectionId)
      ? activeSections.filter(id => id !== sectionId)
      : [...activeSections, sectionId]
    
    onSectionsChange(newSections)
  }
  
  // Handle adding a new section
  const handleAddSection = () => {
    if (newSectionId && !activeSections.includes(newSectionId)) {
      const newSections = [...activeSections, newSectionId]
      onSectionsChange(newSections)
      setNewSectionId('')
      setShowAddSection(false)
    }
  }
  
  // Handle removing a section
  const handleRemoveSection = (sectionId) => {
    // Don't allow removing required sections
    if (template.requiredSections.includes(sectionId)) {
      return
    }
    
    const newSections = activeSections.filter(id => id !== sectionId)
    onSectionsChange(newSections)
  }
  
  // Handle section reordering
  const handleMoveSection = (fromIndex, toIndex) => {
    const newSections = [...activeSections]
    const [removed] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, removed)
    onSectionsChange(newSections)
  }
  
  // Check if section is required
  const isRequired = (sectionId) => template.requiredSections.includes(sectionId)
  
  // Get section display name
  const getSectionDisplayName = (sectionId) => {
    const names = {
      hero: 'Hero Section',
      title: 'Title',
      excerpt: 'Excerpt',
      featuredImage: 'Featured Image',
      content: 'Content',
      author: 'Author Info',
      socialShare: 'Social Share',
      relatedPosts: 'Related Posts',
      tableOfContents: 'Table of Contents',
      quickTips: 'Quick Tips',
      resources: 'Resources',
      checklist: 'Checklist',
      gallery: 'Image Gallery',
      testimonials: 'Testimonials',
      callToAction: 'Call to Action'
    }
    return names[sectionId] || sectionId
  }
  
  // Get section description
  const getSectionDescription = (sectionId) => {
    const descriptions = {
      hero: 'Large hero image with title overlay',
      title: 'Main blog post title',
      excerpt: 'Brief description of the post',
      featuredImage: 'Main image for the post',
      content: 'Main blog post content (required)',
      author: 'Author information and bio',
      socialShare: 'Social media sharing buttons',
      relatedPosts: 'Links to related content',
      tableOfContents: 'Navigation for long posts',
      quickTips: 'Highlighted tips and advice',
      resources: 'Additional helpful resources',
      checklist: 'Interactive checklist items',
      gallery: 'Multiple image showcase',
      testimonials: 'Customer reviews and quotes',
      callToAction: 'Engagement buttons and links'
    }
    return descriptions[sectionId] || 'Content section'
  }
  
  return (
    <div className={`section-manager ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <ArrowsUpDownIcon className="w-5 h-5" />
        <span>Manage Sections ({activeSections.length})</span>
        {isOpen ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
      
      {/* Section Manager Panel */}
      {isOpen && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Template: {template.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure which sections appear in your blog post. Required sections cannot be removed.
            </p>
          </div>
          
          <div className="p-4">
            {/* Active Sections */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Active Sections ({activeSections.length})
              </h4>
              <div className="space-y-2">
                {activeSections.map((sectionId, index) => (
                  <div
                    key={sectionId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {getSectionDisplayName(sectionId)}
                          </span>
                          {isRequired(sectionId) && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getSectionDescription(sectionId)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Move Up */}
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveSection(index, index - 1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      
                      {/* Move Down */}
                      {index < activeSections.length - 1 && (
                        <button
                          onClick={() => handleMoveSection(index, index + 1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      
                      {/* Remove Section */}
                      {!isRequired(sectionId) && (
                        <button
                          onClick={() => handleRemoveSection(sectionId)}
                          className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                          title="Remove section"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add New Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Add Section
              </h4>
              
              {!showAddSection ? (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Section
                </button>
              ) : (
                <div className="space-y-3">
                  <select
                    value={newSectionId}
                    onChange={(e) => setNewSectionId(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">Select a section to add...</option>
                    {availableSections.map(sectionId => (
                      <option key={sectionId} value={sectionId}>
                        {getSectionDisplayName(sectionId)}
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionId}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSection(false)
                        setNewSectionId('')
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Section Limits */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> This template supports up to {template.maxSections} sections. 
                You currently have {activeSections.length} active sections.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
