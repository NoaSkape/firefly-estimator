import { useNavigate } from 'react-router-dom'

const ModelSelector = ({ models, value, onChange }) => {
  const navigate = useNavigate()

  const handleCardClick = (modelId) => {
    onChange(modelId)
  }

  const handleModelNameClick = (e, modelId) => {
    e.stopPropagation() // Prevent card selection when clicking the name
    navigate(`/models/${modelId}`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {models.map((model) => (
        <div
          key={model.id}
          onClick={() => handleCardClick(model.id)}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
            value === model.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-center">
            <h3 
              className="font-semibold text-lg text-gray-900 mb-1 hover:text-primary-600 transition-colors duration-200"
              onClick={(e) => handleModelNameClick(e, model.id)}
              style={{ cursor: 'pointer' }}
            >
              {model.name}
            </h3>
            <p className="text-gray-500 text-sm mb-3">
              {model.subtitle}
            </p>
            <p className="text-gray-600 text-sm mb-3">
              {model.description}
            </p>
            
            <div className="text-2xl font-bold text-primary-600 mb-3">
              ${model.basePrice.toLocaleString()}
            </div>
            
            <div className="space-y-1 text-xs text-gray-500">
              <div>Length: {model.specs.length}</div>
              <div>Width: {model.specs.width}</div>
              <div>Height: {model.specs.height}</div>
              <div>Weight: {model.specs.weight}</div>
              <div>{model.specs.bedrooms} Bedroom{model.specs.bedrooms !== 1 ? 's' : ''}</div>
              <div>{model.specs.bathrooms} Bathroom{model.specs.bathrooms !== 1 ? 's' : ''}</div>
            </div>
            
            <div className="mt-3">
              <h4 className="font-medium text-gray-900 mb-1">Features:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {model.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-primary-500 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
                {model.features.length > 3 && (
                  <li className="text-primary-600 font-medium">
                    +{model.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ModelSelector 