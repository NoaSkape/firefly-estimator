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
          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-sm hover:border-yellow-500/40 hover:shadow-lg ${
            value === model.id ? 'ring-1 ring-yellow-500/50' : ''
          } bg-white border-gray-200 text-gray-900 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-100`}
          data-model-card="true"
        >
          <div className="text-center">
            {/* Main image (primary or first) */}
            {Array.isArray(model.images) && model.images.length > 0 && (
              <img
                src={(model.images.find(i => i.isPrimary)?.url) || model.images[0]?.url}
                alt={model.name}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <h3 
              className="font-semibold text-lg mb-1 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors duration-200"
              onClick={(e) => handleModelNameClick(e, model)}
              style={{ cursor: 'pointer' }}
            >
              {model.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
              {model.subtitle}
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
              {model.description}
            </p>
            
            <div className="text-2xl font-bold text-yellow-400 mb-3">
              ${Number(model.basePrice || 0).toLocaleString()}
            </div>
            
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {model.length && (<div>Length: {model.length}</div>)}
              {model.width && (<div>Width: {model.width}</div>)}
              {model.height && (<div>Height: {model.height}</div>)}
              {model.weight && (<div>Weight: {model.weight}</div>)}
              {typeof model.bedrooms === 'number' && (
                <div>
                  {model.bedrooms} Bedroom{model.bedrooms !== 1 ? 's' : ''}
                </div>
              )}
              {typeof model.bathrooms === 'number' && (
                <div>
                  {model.bathrooms} Bathroom{model.bathrooms !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ModelSelector 