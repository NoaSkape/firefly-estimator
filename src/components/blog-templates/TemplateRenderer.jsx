import React, { useState, useEffect } from 'react'
import { TEMPLATE_REGISTRY, getTemplate, getDefaultSections } from './TemplateRegistry'
import StoryTemplate from './StoryTemplate'
import EducationalTemplate from './EducationalTemplate'
import InspirationalTemplate from './InspirationalTemplate'

export default function TemplateRenderer({ 
  postData, 
  templateId, 
  isPreview = false,
  isEditing = false,
  onSectionChange 
}) {
  const [activeSections, setActiveSections] = useState([])
  const [template, setTemplate] = useState(null)
  
  // Initialize template and sections when templateId changes
  useEffect(() => {
    const newTemplate = getTemplate(templateId)
    setTemplate(newTemplate)
    
    // Get default sections for the new template
    const defaultSections = getDefaultSections(templateId)
    setActiveSections(defaultSections)
    
    // Notify parent component of section change
    if (onSectionChange) {
      onSectionChange(defaultSections)
    }
  }, [templateId, onSectionChange])
  
  // Handle section deletion
  const handleSectionDelete = (sectionId) => {
    const newSections = activeSections.filter(id => id !== sectionId)
    setActiveSections(newSections)
    
    if (onSectionChange) {
      onSectionChange(newSections)
    }
  }
  
  // Handle section reordering
  const handleSectionReorder = (fromIndex, toIndex) => {
    const newSections = [...activeSections]
    const [removed] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, removed)
    setActiveSections(newSections)
    
    if (onSectionChange) {
      onSectionChange(newSections)
    }
  }
  
  // Handle section toggle (add/remove)
  const handleSectionToggle = (sectionId) => {
    const newSections = activeSections.includes(sectionId)
      ? activeSections.filter(id => id !== sectionId)
      : [...activeSections, sectionId]
    
    setActiveSections(newSections)
    
    if (onSectionChange) {
      onSectionChange(newSections)
    }
  }
  
  // If no template is selected, show a placeholder
  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Select a Template
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a template to start creating your blog post
          </p>
        </div>
      </div>
    )
  }
  
  // Render the appropriate template based on templateId
  const renderTemplate = () => {
    const templateProps = {
      postData,
      activeSections,
      onSectionDelete: handleSectionDelete,
      onSectionReorder: handleSectionReorder,
      onSectionToggle: handleSectionToggle,
      isPreview,
      isEditing
    }
    
    switch (templateId) {
      case 'story':
        return <StoryTemplate {...templateProps} />
      case 'educational':
        return <EducationalTemplate {...templateProps} />
      case 'inspiration':
        return <InspirationalTemplate {...templateProps} />
      default:
        return <StoryTemplate {...templateProps} />
    }
  }
  
  return (
    <div className="template-renderer">
      {renderTemplate()}
      
      {/* Debug information (only show in development) */}
      {import.meta.env?.DEV && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm max-w-xs">
          <div className="font-semibold mb-2">Template Debug</div>
          <div>Template: {template.name}</div>
          <div>Active Sections: {activeSections.length}</div>
          <div className="text-xs text-gray-300 mt-1">
            {activeSections.join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing template sections
export const useTemplateSections = (templateId) => {
  const [activeSections, setActiveSections] = useState([])
  
  useEffect(() => {
    const defaultSections = getDefaultSections(templateId)
    setActiveSections(defaultSections)
  }, [templateId])
  
  const addSection = (sectionId) => {
    if (!activeSections.includes(sectionId)) {
      setActiveSections(prev => [...prev, sectionId])
    }
  }
  
  const removeSection = (sectionId) => {
    setActiveSections(prev => prev.filter(id => id !== sectionId))
  }
  
  const toggleSection = (sectionId) => {
    if (activeSections.includes(sectionId)) {
      removeSection(sectionId)
    } else {
      addSection(sectionId)
    }
  }
  
  const reorderSections = (fromIndex, toIndex) => {
    setActiveSections(prev => {
      const newSections = [...prev]
      const [removed] = newSections.splice(fromIndex, 1)
      newSections.splice(toIndex, 0, removed)
      return newSections
    })
  }
  
  const resetToDefaults = () => {
    const defaultSections = getDefaultSections(templateId)
    setActiveSections(defaultSections)
  }
  
  return {
    activeSections,
    addSection,
    removeSection,
    toggleSection,
    reorderSections,
    resetToDefaults,
    setActiveSections
  }
}
