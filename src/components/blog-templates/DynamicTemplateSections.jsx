import React, { useState, useRef } from 'react'
import { 
  PhotoIcon,
  VideoCameraIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  ChartBarIcon,
  SparklesIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

// Story-Driven Template Sections
const HeroStorySection = ({ data = {}, onChange }) => {
  const fileInputRef = useRef(null)

  const updateData = (updates) => {
    onChange({ ...data, ...updates })
  }

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-5 h-5 text-orange-500" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Hero Story Section</h4>
      </div>
      
      <div className="space-y-4">
        {/* Hero Image */}
        <div>
          <label className="block text-sm font-medium mb-2">Hero Image</label>
          {data.heroImage ? (
            <div className="relative">
              <img 
                src={data.heroImage} 
                alt="Hero" 
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                onClick={() => updateData({ heroImage: null })}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-orange-400"
            >
              <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Upload hero image</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) {
                // Handle file upload here
                console.log('Upload hero image:', file)
              }
            }}
          />
        </div>

        {/* Headline Overlay */}
        <div>
          <label className="block text-sm font-medium mb-2">Compelling Headline</label>
          <input
            type="text"
            value={data.headline || ''}
            onChange={(e) => updateData({ headline: e.target.value })}
            placeholder="Enter your attention-grabbing headline..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        {/* Emotional Hook */}
        <div>
          <label className="block text-sm font-medium mb-2">Emotional Hook</label>
          <textarea
            value={data.emotionalHook || ''}
            onChange={(e) => updateData({ emotionalHook: e.target.value })}
            rows={3}
            placeholder="Write something that connects emotionally with your readers..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  )
}

const PersonalJourneySection = ({ data = {}, onChange }) => {
  const updateData = (updates) => {
    onChange({ ...data, ...updates })
  }

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
      <div className="flex items-center gap-2 mb-4">
        <HeartIcon className="w-5 h-5 text-blue-500" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Personal Journey Section</h4>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Customer Story</label>
          <textarea
            value={data.customerStory || ''}
            onChange={(e) => updateData({ customerStory: e.target.value })}
            rows={5}
            placeholder="Share a real customer experience or personal story..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Before Image</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Before photo</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">After Image</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600 dark:text-gray-400">After photo</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Customer Quote</label>
          <textarea
            value={data.customerQuote || ''}
            onChange={(e) => updateData({ customerQuote: e.target.value })}
            rows={2}
            placeholder="Add a compelling quote from the customer..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  )
}

// Educational Template Sections
const LearningObjectivesSection = ({ data = {}, onChange }) => {
  const updateData = (updates) => {
    onChange({ ...data, ...updates })
  }

  const addObjective = () => {
    const objectives = data.objectives || []
    updateData({ objectives: [...objectives, ''] })
  }

  const updateObjective = (index, value) => {
    const objectives = [...(data.objectives || [])]
    objectives[index] = value
    updateData({ objectives })
  }

  const removeObjective = (index) => {
    const objectives = [...(data.objectives || [])]
    objectives.splice(index, 1)
    updateData({ objectives })
  }

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
      <div className="flex items-center gap-2 mb-4">
        <DocumentTextIcon className="w-5 h-5 text-green-500" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Learning Objectives</h4>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Estimated Reading Time</label>
          <input
            type="text"
            value={data.readingTime || ''}
            onChange={(e) => updateData({ readingTime: e.target.value })}
            placeholder="e.g., 5 min read"
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Knowledge Level</label>
          <select
            value={data.knowledgeLevel || ''}
            onChange={(e) => updateData({ knowledgeLevel: e.target.value })}
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">Select level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Learning Objectives</label>
            <button
              onClick={addObjective}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add Objective
            </button>
          </div>
          
          <div className="space-y-2">
            {(data.objectives || []).map((objective, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => updateObjective(index, e.target.value)}
                  placeholder={`Learning objective ${index + 1}...`}
                  className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
                <button
                  onClick={() => removeObjective(index)}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const DataAnalyticsSection = ({ data = {}, onChange }) => {
  const updateData = (updates) => {
    onChange({ ...data, ...updates })
  }

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="w-5 h-5 text-purple-500" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Data & Analytics Section</h4>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Chart/Graph Upload</label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">Upload charts, graphs, or infographics</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Key Statistics</label>
          <textarea
            value={data.statistics || ''}
            onChange={(e) => updateData({ statistics: e.target.value })}
            rows={4}
            placeholder="Add key statistics and data points..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Data Source Citations</label>
          <input
            type="text"
            value={data.dataSources || ''}
            onChange={(e) => updateData({ dataSources: e.target.value })}
            placeholder="List your data sources and citations..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  )
}

// Inspirational Template Sections
const VisualImpactSection = ({ data = {}, onChange }) => {
  const updateData = (updates) => {
    onChange({ ...data, ...updates })
  }

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-5 h-5 text-pink-500" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Visual Impact Hero</h4>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Hero Video/Image</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Full-width hero image</p>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Hero video</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Animated Text Overlay</label>
          <input
            type="text"
            value={data.animatedText || ''}
            onChange={(e) => updateData({ animatedText: e.target.value })}
            placeholder="Text for animated overlay..."
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Color Gradient Background</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="color"
              value={data.gradientStart || '#ff6b6b'}
              onChange={(e) => updateData({ gradientStart: e.target.value })}
              className="w-full h-12 rounded-lg border"
            />
            <input
              type="color"
              value={data.gradientEnd || '#4ecdc4'}
              onChange={(e) => updateData({ gradientEnd: e.target.value })}
              className="w-full h-12 rounded-lg border"
            />
            <div 
              className="h-12 rounded-lg border"
              style={{
                background: `linear-gradient(45deg, ${data.gradientStart || '#ff6b6b'}, ${data.gradientEnd || '#4ecdc4'})`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Dynamic Template Sections Component
export default function DynamicTemplateSections({ template, sections = {}, onSectionsChange }) {
  const updateSection = (sectionKey, sectionData) => {
    onSectionsChange({
      ...sections,
      [sectionKey]: sectionData
    })
  }

  const renderSection = (sectionKey, SectionComponent) => {
    return (
      <SectionComponent
        key={sectionKey}
        data={sections[sectionKey] || {}}
        onChange={(data) => updateSection(sectionKey, data)}
      />
    )
  }

  const templateSections = {
    'story-driven': [
      { key: 'heroStory', component: HeroStorySection, title: 'Hero Story' },
      { key: 'personalJourney', component: PersonalJourneySection, title: 'Personal Journey' },
    ],
    'educational': [
      { key: 'learningObjectives', component: LearningObjectivesSection, title: 'Learning Objectives' },
      { key: 'dataAnalytics', component: DataAnalyticsSection, title: 'Data & Analytics' },
    ],
    'inspiration': [
      { key: 'visualImpact', component: VisualImpactSection, title: 'Visual Impact' },
    ]
  }

  const currentSections = templateSections[template] || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Dynamic Template Sections
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {template.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Template
        </span>
      </div>
      
      {currentSections.length > 0 ? (
        <div className="space-y-4">
          {currentSections.map(({ key, component: SectionComponent }) => 
            renderSection(key, SectionComponent)
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Select a template to see dynamic content sections</p>
        </div>
      )}
    </div>
  )
}
