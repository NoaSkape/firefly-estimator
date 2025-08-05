const OptionSelector = ({ options, selectedOptions, onToggle }) => {
  const isSelected = (option) => {
    return selectedOptions.find(item => item.id === option.id) !== undefined
  }

  return (
    <div className="space-y-6">
      {options.map((category) => (
        <div key={category.id} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            {category.name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.options.map((option) => (
              <div
                key={option.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected(option)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => onToggle(option)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected(option)}
                      onChange={() => onToggle(option)}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {option.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </div>
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