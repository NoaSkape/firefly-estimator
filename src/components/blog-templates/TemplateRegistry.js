import StoryTemplate from './StoryTemplate'
import EducationalTemplate from './EducationalTemplate'
import InspirationalTemplate from './InspirationalTemplate'

// Template registry with metadata and configuration
export const TEMPLATE_REGISTRY = {
  story: {
    id: 'story',
    name: 'Story-Driven',
    component: StoryTemplate,
    description: 'Personal experience and narrative flow',
    icon: 'BookOpenIcon',
    color: 'bg-blue-500',
    defaultSections: [
      'hero',
      'title',
      'excerpt', 
      'featuredImage',
      'content',
      'author',
      'socialShare',
      'relatedPosts'
    ],
    requiredSections: ['title', 'content'],
    layout: 'sidebar-right',
    maxSections: 12
  },
  educational: {
    id: 'educational',
    name: 'Educational',
    component: EducationalTemplate,
    description: 'How-to guides and step-by-step content',
    icon: 'DocumentTextIcon',
    color: 'bg-green-500',
    defaultSections: [
      'hero',
      'title',
      'excerpt',
      'featuredImage',
      'tableOfContents',
      'content',
      'quickTips',
      'resources',
      'checklist',
      'relatedPosts'
    ],
    requiredSections: ['title', 'content'],
    layout: 'two-column',
    maxSections: 15
  },
  inspiration: {
    id: 'inspiration',
    name: 'Inspirational',
    component: InspirationalTemplate,
    description: 'Visual showcase and design inspiration',
    icon: 'PaintBrushIcon',
    color: 'bg-purple-500',
    defaultSections: [
      'hero',
      'title',
      'excerpt',
      'featuredImage',
      'gallery',
      'content',
      'testimonials',
      'callToAction',
      'socialShare',
      'relatedPosts'
    ],
    requiredSections: ['title', 'content'],
    layout: 'full-width',
    maxSections: 18
  }
}

// Get template by ID
export const getTemplate = (templateId) => {
  return TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.story
}

// Get all available templates
export const getAllTemplates = () => {
  return Object.values(TEMPLATE_REGISTRY)
}

// Validate template configuration
export const validateTemplate = (templateId, sections) => {
  const template = getTemplate(templateId)
  if (!template) return false
  
  // Check required sections
  const hasRequiredSections = template.requiredSections.every(section => 
    sections.includes(section)
  )
  
  // Check max sections
  const withinMaxSections = sections.length <= template.maxSections
  
  return hasRequiredSections && withinMaxSections
}

// Get default sections for a template
export const getDefaultSections = (templateId) => {
  const template = getTemplate(templateId)
  return template ? [...template.defaultSections] : []
}

// Get template metadata for display
export const getTemplateMetadata = (templateId) => {
  const template = getTemplate(templateId)
  if (!template) return null
  
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    icon: template.icon,
    color: template.color,
    layout: template.layout
  }
}
