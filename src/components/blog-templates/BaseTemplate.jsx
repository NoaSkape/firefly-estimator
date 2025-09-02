import React from 'react'
import { TrashIcon, PlusIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'

// Base template component that all templates extend
export default function BaseTemplate({ 
  postData, 
  templateId, 
  activeSections, 
  onSectionToggle, 
  onSectionDelete, 
  onSectionReorder,
  isPreview = false,
  isEditing = false 
}) {
  
  // Common section components that can be reused across templates
  const SectionWrapper = ({ 
    sectionId, 
    children, 
    className = '', 
    isDeletable = true,
    isRequired = false 
  }) => {
    if (isPreview) {
      return <div className={className}>{children}</div>
    }

    return (
      <div className={`relative group ${className}`}>
        {children}
        
        {isEditing && isDeletable && !isRequired && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSectionDelete(sectionId)}
              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-colors"
              title={`Delete ${sectionId} section`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {isEditing && isDeletable && (
          <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white p-1 rounded-full shadow-lg transition-colors cursor-move"
              title={`Reorder ${sectionId} section`}
            >
              <ArrowsUpDownIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Common content section component
  const ContentSection = ({ sectionId, title, children, className = '' }) => (
    <SectionWrapper 
      sectionId={sectionId} 
      isDeletable={true}
      isRequired={sectionId === 'content'}
      className={className}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {title}
          </h3>
        )}
        {children}
      </div>
    </SectionWrapper>
  )

  // Common image section component
  const ImageSection = ({ sectionId, image, alt, className = '' }) => (
    <SectionWrapper 
      sectionId={sectionId} 
      isDeletable={true}
      className={className}
    >
      {image ? (
        <div className="relative">
          <img
            src={typeof image === 'string' ? image : image.url}
            alt={alt || 'Blog image'}
            className="w-full h-auto rounded-lg shadow-sm"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">No image</span>
        </div>
      )}
    </SectionWrapper>
  )

  // Common text section component
  const TextSection = ({ sectionId, content, className = '' }) => (
    <SectionWrapper 
      sectionId={sectionId} 
      isDeletable={true}
      className={className}
    >
      <div 
        className="prose max-w-none text-gray-700 dark:text-gray-300"
        dangerouslySetInnerHTML={{ __html: content || '' }}
      />
    </SectionWrapper>
  )

  // Common button component
  const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
    const variants = {
      primary: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 focus:ring-yellow-500',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
      outline: 'border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-gray-900 focus:ring-yellow-500'
    }
    
    return (
      <button 
        className={`${baseClasses} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }

  // Common card component
  const Card = ({ children, className = '', ...props }) => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  )

  // Common badge component
  const Badge = ({ children, variant = 'default', className = '' }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    const variants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      primary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    
    return (
      <span className={`${baseClasses} ${variants[variant]} ${className}`}>
        {children}
      </span>
    )
  }

  // Common divider component
  const Divider = ({ className = '' }) => (
    <hr className={`border-gray-200 dark:border-gray-700 my-8 ${className}`} />
  )

  // Common spacing component
  const Spacer = ({ size = 'md' }) => {
    const sizes = {
      sm: 'h-4',
      md: 'h-8',
      lg: 'h-12',
      xl: 'h-16'
    }
    return <div className={sizes[size]} />
  }

  // Expose common components to child templates
  const commonComponents = {
    SectionWrapper,
    ContentSection,
    ImageSection,
    TextSection,
    Button,
    Card,
    Badge,
    Divider,
    Spacer
  }

  // This base component doesn't render anything by itself
  // It's meant to be extended by specific template components
  return null
}

// Hook for managing template sections
export const useTemplateSections = (templateId, initialSections = []) => {
  const [activeSections, setActiveSections] = React.useState(initialSections)
  
  const toggleSection = (sectionId) => {
    setActiveSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }
  
  const deleteSection = (sectionId) => {
    setActiveSections(prev => prev.filter(id => id !== sectionId))
  }
  
  const addSection = (sectionId) => {
    if (!activeSections.includes(sectionId)) {
      setActiveSections(prev => [...prev, sectionId])
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
  
  return {
    activeSections,
    toggleSection,
    deleteSection,
    addSection,
    reorderSections
  }
}
