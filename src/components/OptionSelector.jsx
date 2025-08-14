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
          className="card overflow-hidden transition-colors hover:border-yellow-500/40"
        >
          {/* Subject Header - Clickable Accordion Trigger */}
          <button
            type="button"
            onClick={() => toggleSubject(category.subject)}
            className="w-full px-4 py-3 font-semibold text-left transition-colors duration-200 flex justify-between items-center bg-transparent text-current border-b border-white/10"
          >
            <span>{category.subject}</span>
            <span className="opacity-60">
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
                    <div className={`font-medium ${option.isPackage ? 'text-blue-500' : 'text-current'}`}>
                      {option.name} - ${option.price.toLocaleString()}
                    </div>
                    {option.description && (
                      <div className="text-sm opacity-80 bg-black/5 dark:bg-white/5 p-2 rounded mt-1">
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