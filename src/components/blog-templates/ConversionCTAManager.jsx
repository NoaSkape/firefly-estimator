import React, { useState } from 'react'
import { 
  ShoppingCartIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  PhoneIcon,
  ArrowRightIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const CTA_TYPES = {
  'design': {
    label: 'Design Your Tiny Home',
    description: 'Customize and get a quote',
    icon: WrenchScrewdriverIcon,
    color: 'from-blue-600 to-purple-600',
    action: 'design',
    primary: true
  },
  'explore-models': {
    label: 'Explore Our Models',
    description: 'Browse available tiny homes',
    icon: HomeIcon,
    color: 'from-green-600 to-teal-600',
    action: 'explore-models',
    primary: true
  },
  'explore-firefly': {
    label: 'Explore Firefly Tiny Homes',
    description: 'Discover our company story',
    icon: HomeIcon,
    color: 'from-orange-600 to-red-600',
    action: 'explore-firefly',
    primary: true
  },
  'get-quote': {
    label: 'Get Your Quote',
    description: 'Quick pricing estimate',
    icon: PhoneIcon,
    color: 'from-purple-600 to-pink-600',
    action: 'get-quote',
    primary: true
  },
  'see-available': {
    label: 'See Available Models',
    description: 'Check current inventory',
    icon: ShoppingCartIcon,
    color: 'from-indigo-600 to-blue-600',
    action: 'see-available',
    primary: true
  },
  'tell-story': {
    label: 'Tell Your Story!',
    description: 'Share your tiny home journey',
    icon: EyeIcon,
    color: 'from-gray-600 to-gray-700',
    action: 'tell-story',
    primary: false
  }
}

export default function ConversionCTAManager({ 
  ctas = [],
  onCTAsChange = () => {},
  className = ''
}) {
  const [isAddingCTA, setIsAddingCTA] = useState(false)
  const [selectedCTA, setSelectedCTA] = useState('')

  const addCTA = () => {
    if (selectedCTA && !ctas.find(cta => cta.type === selectedCTA)) {
      const newCTAs = [...ctas, { type: selectedCTA, position: 'bottom' }]
      onCTAsChange(newCTAs)
      setSelectedCTA('')
      setIsAddingCTA(false)
    }
  }

  const removeCTA = (index) => {
    const newCTAs = ctas.filter((_, i) => i !== index)
    onCTAsChange(newCTAs)
  }

  const moveCTA = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newCTAs = [...ctas]
      ;[newCTAs[index], newCTAs[index - 1]] = [newCTAs[index - 1], newCTAs[index]]
      onCTAsChange(newCTAs)
    } else if (direction === 'down' && index < ctas.length - 1) {
      const newCTAs = [...ctas]
      ;[newCTAs[index], newCTAs[index + 1]] = [newCTAs[index + 1], newCTAs[index]]
      onCTAsChange(newCTAs)
    }
  }

  const renderCTA = (cta, index) => {
    const ctaConfig = CTA_TYPES[cta.type]
    if (!ctaConfig) return null

    const IconComponent = ctaConfig.icon

    return (
      <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${ctaConfig.color}`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {ctaConfig.label}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {ctaConfig.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => moveCTA(index, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↑
            </button>
            <button
              onClick={() => moveCTA(index, 'down')}
              disabled={index === ctas.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↓
            </button>
            <button
              onClick={() => removeCTA(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full ${
            ctaConfig.primary 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {ctaConfig.primary ? 'Primary CTA' : 'Secondary CTA'}
          </span>
          <span className="text-gray-500">Position: {cta.position}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`conversion-cta-manager ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Conversion CTAs
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add CTAs that drive visitors to your tiny home sales funnel
            </p>
          </div>
          <button
            onClick={() => setIsAddingCTA(!isAddingCTA)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add CTA
          </button>
        </div>

        {/* Add CTA Form */}
        {isAddingCTA && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-4">
              <select
                value={selectedCTA}
                onChange={(e) => setSelectedCTA(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select CTA type...</option>
                {Object.entries(CTA_TYPES).map(([key, cta]) => (
                  <option key={key} value={key}>
                    {cta.label} - {cta.description}
                  </option>
                ))}
              </select>
              <button
                onClick={addCTA}
                disabled={!selectedCTA}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingCTA(false)
                  setSelectedCTA('')
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CTA List */}
        <div className="space-y-4">
          {ctas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No CTAs added yet. Add your first CTA to start driving conversions!</p>
            </div>
          ) : (
            ctas.map((cta, index) => renderCTA(cta, index))
          )}
        </div>

        {/* CTA Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
            💡 CTA Strategy Tips
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• <strong>Primary CTAs:</strong> Use 1-2 main CTAs per post (Design, Explore, Quote)</li>
            <li>• <strong>Secondary CTAs:</strong> Add community features like "Tell Your Story" sparingly</li>
            <li>• <strong>Placement:</strong> Put main CTAs near the top and bottom of your content</li>
            <li>• <strong>Variety:</strong> Mix different CTA types to avoid overwhelming visitors</li>
            <li>• <strong>Context:</strong> Match CTA to the content topic (e.g., "Design" for customization posts)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
