import { useState } from 'react'

const OptionSelector = ({ options, selectedItems, onSelectionChange }) => {
  // Track which subjects are currently expanded (multiple can be open)
  const [expandedSubjects, setExpandedSubjects] = useState(new Set())

  const isSelected = (option) => {
    return selectedItems.find(item => item.id === option.id) !== undefined
  }

  const toggleSubject = (subject) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subject)) {
        newSet.delete(subject)
      } else {
        newSet.add(subject)
      }
      return newSet
    })
  }

  const handleOptionToggle = (option, subject) => {
    const newSelection = isSelected(option)
      ? selectedItems.filter(item => item.id !== option.id)
      : [...selectedItems, { ...option, subject }]
    onSelectionChange(newSelection)
  }

  return (
    <div className="space-y-4">
      {options.map((category) => (
        <div
          key={category.subject}
          className="border rounded-lg overflow-hidden bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 shadow backdrop-blur-sm transition-colors hover:border-yellow-500/40"
        >
          {/* Subject Header - Clickable Accordion Trigger */}
          <button
            type="button"
            onClick={() => toggleSubject(category.subject)}
            className="w-full px-4 py-3 font-semibold text-left transition-colors duration-200 flex justify-between items-center bg-transparent text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
          >
            <span>{category.subject}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {expandedSubjects.has(category.subject) ? '▾' : '▸'}
            </span>
          </button>

          {/* Accordion Body - Expanded Content */}
          {expandedSubjects.has(category.subject) && (
            <div className="p-4 space-y-3">
              {category.items.map((option) => (
                <div key={option.id} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected(option)}
                    onChange={() => handleOptionToggle(option, category.subject)}
                    className="mt-1 h-4 w-4 text-yellow-500 border-gray-300 dark:border-gray-600 rounded focus:ring-yellow-500"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${option.isPackage ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}>
                      {option.name} - ${option.price.toLocaleString()}
                    </div>
                    {option.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded mt-1">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default OptionSelector 