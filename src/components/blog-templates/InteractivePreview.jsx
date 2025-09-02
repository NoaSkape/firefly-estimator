import React, { useState, useEffect } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon,
  SwatchIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

export default function InteractivePreview({ 
  children, 
  postData, 
  templateId,
  className = '' 
}) {
  const [previewMode, setPreviewMode] = useState('desktop')
  const [colorScheme, setColorScheme] = useState('light')
  const [typographyScale, setTypographyScale] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [readingMode, setReadingMode] = useState(false)
  const [customColors, setCustomColors] = useState({
    primary: '#f59e0b',
    secondary: '#6b7280',
    accent: '#3b82f6'
  })

  // Apply dynamic styles based on settings
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--typography-scale', typographyScale)
    root.style.setProperty('--color-primary', customColors.primary)
    root.style.setProperty('--color-secondary', customColors.secondary)
    root.style.setProperty('--color-accent', customColors.accent)
  }, [typographyScale, customColors])

  // Get preview container classes based on mode
  const getPreviewClasses = () => {
    const baseClasses = 'mx-auto bg-white dark:bg-gray-900 transition-all duration-300'
    
    switch (previewMode) {
      case 'mobile':
        return `${baseClasses} max-w-sm border-8 border-gray-800 rounded-3xl shadow-2xl`
      case 'tablet':
        return `${baseClasses} max-w-2xl border-6 border-gray-700 rounded-2xl shadow-xl`
      case 'desktop':
        return `${baseClasses} max-w-6xl border-4 border-gray-600 rounded-lg shadow-lg`
      default:
        return baseClasses
    }
  }

  // Color scheme presets
  const colorPresets = {
    firefly: { primary: '#f59e0b', secondary: '#6b7280', accent: '#3b82f6' },
    ocean: { primary: '#0891b2', secondary: '#64748b', accent: '#7c3aed' },
    forest: { primary: '#059669', secondary: '#6b7280', accent: '#dc2626' },
    sunset: { primary: '#ea580c', secondary: '#7c2d12', accent: '#be185d' }
  }

  return (
    <div className={`interactive-preview ${className}`}>
      {/* Preview Controls */}
      {showControls && (
        <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-4">
                {/* Device Preview */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview:</span>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded-md transition-colors ${
                        previewMode === 'mobile' 
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Mobile Preview"
                    >
                      <DevicePhoneMobileIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`p-2 rounded-md transition-colors ${
                        previewMode === 'tablet' 
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Tablet Preview"
                    >
                      <DeviceTabletIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded-md transition-colors ${
                        previewMode === 'desktop' 
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Desktop Preview"
                    >
                      <ComputerDesktopIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme:</span>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setColorScheme('light')}
                      className={`p-2 rounded-md transition-colors ${
                        colorScheme === 'light' 
                          ? 'bg-white dark:bg-gray-600 text-yellow-600 dark:text-yellow-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Light Theme"
                    >
                      <SunIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setColorScheme('dark')}
                      className={`p-2 rounded-md transition-colors ${
                        colorScheme === 'dark' 
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Dark Theme"
                    >
                      <MoonIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Typography Scale */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Size:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTypographyScale(Math.max(0.8, typographyScale - 0.1))}
                      className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      A-
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
                      {Math.round(typographyScale * 100)}%
                    </span>
                    <button
                      onClick={() => setTypographyScale(Math.min(1.5, typographyScale + 0.1))}
                      className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3">
                {/* Color Presets */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Colors:</span>
                  <div className="flex gap-1">
                    {Object.entries(colorPresets).map(([name, colors]) => (
                      <button
                        key={name}
                        onClick={() => setCustomColors(colors)}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm transition-transform hover:scale-110"
                        style={{
                          background: `linear-gradient(45deg, ${colors.primary}, ${colors.accent})`
                        }}
                        title={`${name.charAt(0).toUpperCase() + name.slice(1)} theme`}
                      />
                    ))}
                  </div>
                </div>

                {/* Reading Mode */}
                <button
                  onClick={() => setReadingMode(!readingMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    readingMode 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="Reading Mode"
                >
                  <SwatchIcon className="w-4 h-4" />
                </button>

                {/* Hide Controls */}
                <button
                  onClick={() => setShowControls(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Hide Controls"
                >
                  <EyeSlashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Controls Button (when hidden) */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed top-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Show Controls"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
        </button>
      )}

      {/* Preview Container */}
      <div className="p-6">
        <div className={getPreviewClasses()}>
          {/* Reading Mode Overlay */}
          {readingMode && (
            <div className="fixed inset-0 bg-yellow-50 dark:bg-yellow-900/10 z-40 pointer-events-none" />
          )}
          
          {/* Content */}
          <div className={`${colorScheme === 'dark' ? 'dark' : ''}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        <p>
          Previewing as: <strong className="text-gray-700 dark:text-gray-300">{previewMode}</strong> • 
          Theme: <strong className="text-gray-700 dark:text-gray-300">{colorScheme}</strong> • 
          Text: <strong className="text-gray-700 dark:text-gray-300">{Math.round(typographyScale * 100)}%</strong>
          {readingMode && ' • Reading Mode Active'}
        </p>
      </div>
    </div>
  )
}
