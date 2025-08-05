import { useState } from 'react'

const OptionSelector = ({ options, selectedItems, onSelectionChange }) => {
  const [expandedPackages, setExpandedPackages] = useState(new Set())

  const isSelected = (option) => {
    return selectedItems.find(item => item.id === option.id) !== undefined
  }

  const togglePackage = (packageId) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(packageId)) {
        newSet.delete(packageId)
      } else {
        newSet.add(packageId)
      }
      return newSet
    })
  }

  const handleOptionToggle = (option) => {
    const newSelection = isSelected(option)
      ? selectedItems.filter(item => item.id !== option.id)
      : [...selectedItems, option]
    onSelectionChange(newSelection)
  }

  return (
    <div className="space-y-6">
      {options.map((category) => (
        <div key={category.subject} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            {category.subject}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map((option) => (
              <div
                key={option.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected(option)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => handleOptionToggle(option)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected(option)}
                      onChange={() => handleOptionToggle(option)}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${option.isPackage ? 'text-blue-600' : 'text-gray-900'}`}>
                        {option.name}
                        {option.isPackage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePackage(option.id)
                            }}
                            className="ml-2 text-blue-500 hover:text-blue-700 text-sm"
                          >
                            {expandedPackages.has(option.id) ? 'Hide' : 'Show'} Details
                          </button>
                        )}
                      </div>
                      {option.isPackage && expandedPackages.has(option.id) && (
                        <div className="text-sm text-gray-600 mt-1 bg-blue-50 p-2 rounded">
                          {option.description}
                        </div>
                      )}
                      {!option.isPackage && option.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="font-semibold text-primary-600">
                    ${option.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default OptionSelector 