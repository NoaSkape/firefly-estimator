import { useState, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function AdminFAQEditor({ content, onClose, onSaved }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')
  const isAdmin = canEditModelsClient(user)

  // Local editable state
  const [pageContent, setPageContent] = useState(content || {})
  const [faqSections, setFaqSections] = useState(content?.faqSections || [
    {
      title: 'Park Model Basics',
      items: [
        {
          question: 'What is a park model home?',
          answer: 'A park model home is a small, factory-built home on a wheeled chassis that is limited to 400 square feet of living space (not counting porches or lofts). Park models are perfect for downsizing, vacation properties, AirBNBs. or full-time living in areas where permitted.'
        }
      ]
    }
  ])

  const handleSave = async () => {
    if (!isAdmin) return
    
    setSaving(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/pages/faq', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: {
            ...pageContent,
            faqSections
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (debug) console.log('FAQ saved:', result)
        onSaved(result)
        onClose()
      } else {
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving FAQ:', error)
      alert('Failed to save FAQ content. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateContentField = (field, value) => {
    setPageContent(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addSection = () => {
    setFaqSections(prev => [
      ...prev,
      {
        title: 'New Section',
        items: []
      }
    ])
  }

  const removeSection = (sectionIndex) => {
    setFaqSections(prev => prev.filter((_, index) => index !== sectionIndex))
  }

  const updateSectionTitle = (sectionIndex, title) => {
    setFaqSections(prev => prev.map((section, index) => 
      index === sectionIndex ? { ...section, title } : section
    ))
  }

  const addFAQItem = (sectionIndex) => {
    setFaqSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { 
            ...section, 
            items: [...section.items, { question: 'New Question', answer: 'New Answer' }]
          }
        : section
    ))
  }

  const removeFAQItem = (sectionIndex, itemIndex) => {
    setFaqSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { 
            ...section, 
            items: section.items.filter((_, itemIdx) => itemIdx !== itemIndex)
          }
        : section
    ))
  }

  const updateFAQItem = (sectionIndex, itemIndex, field, value) => {
    setFaqSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { 
            ...section, 
            items: section.items.map((item, itemIdx) => 
              itemIdx === itemIndex 
                ? { ...item, [field]: value }
                : item
            )
          }
        : section
    ))
  }

  if (!isAdmin) { return null }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-full max-w-6xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col text-gray-900 dark:text-gray-100">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit FAQ Page</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="px-4 pt-2 flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {['content', 'faq'].map(tab => (
            <button key={tab} className={`px-3 py-2 ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-700' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'content' ? 'Page Content' : 'FAQ Items'}
            </button>
          ))}
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Page Title</label>
                <input
                  type="text"
                  value={pageContent.title || ''}
                  onChange={(e) => updateContentField('title', e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Park Model Homes FAQ | Firefly Tiny Homes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Page Description</label>
                <textarea
                  value={pageContent.description || ''}
                  onChange={(e) => updateContentField('description', e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  placeholder="Find answers to everything about park model homes..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Header Description</label>
                <textarea
                  value={pageContent.headerDescription || ''}
                  onChange={(e) => updateContentField('headerDescription', e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  rows={4}
                  placeholder="Welcome to our FAQ section! Here's everything you need to know..."
                />
              </div>
            </div>
          )}
          
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">FAQ Sections</h3>
                <button
                  onClick={addSection}
                  className="btn-primary px-3 py-1 text-sm flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Section
                </button>
              </div>
              
              {faqSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 px-2 py-1"
                    />
                    <button
                      onClick={() => removeSection(sectionIndex)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <label className="block text-sm font-medium">Question {itemIndex + 1}</label>
                          <button
                            onClick={() => removeFAQItem(sectionIndex, itemIndex)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateFAQItem(sectionIndex, itemIndex, 'question', e.target.value)}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 mb-2"
                          placeholder="Enter question..."
                        />
                        <label className="block text-sm font-medium mb-2">Answer</label>
                        <textarea
                          value={item.answer}
                          onChange={(e) => updateFAQItem(sectionIndex, itemIndex, 'answer', e.target.value)}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                          rows={3}
                          placeholder="Enter answer..."
                        />
                      </div>
                    ))}
                    
                    <button
                      onClick={() => addFAQItem(sectionIndex)}
                      className="btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add FAQ Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button disabled={saving} className="btn-primary disabled:opacity-50" onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
