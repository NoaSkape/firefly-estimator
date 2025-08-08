import { useNavigate } from 'react-router-dom'
import { generateModelUrl } from '../utils/modelUrlMapping'

const ModelSelector = ({ models, value, onChange }) => {
  const navigate = useNavigate()

  const handleCardClick = (modelCode) => {
    onChange(modelCode)
  }

  const handleModelNameClick = (e, model) => {
    e.stopPropagation() // Prevent card selection when clicking the name
    const modelUrl = generateModelUrl(model)
    if (modelUrl) {
      navigate(modelUrl)
    }
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
              onClick={(e) => handleModelNameClick(e, model)}
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
              <div>Length: {model.length}</div>
              <div>Width: {model.width}</div>
              <div>Height: {model.height}</div>
              <div>Weight: {model.weight}</div>
              <div>{model.bedrooms} Bedroom{model.bedrooms !== 1 ? 's' : ''}</div>
              <div>{model.bathrooms} Bathroom{model.bathrooms !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ModelSelector 