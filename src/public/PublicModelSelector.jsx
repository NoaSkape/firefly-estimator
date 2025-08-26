import { useNavigate } from 'react-router-dom'
import { modelIdToSlug } from '../utils/modelUrlMapping'

// Public-only copy to avoid affecting the estimator component
export default function PublicModelSelector({ models }) {
  const navigate = useNavigate()
  const goConfigure = (modelId) => {
    const slug = modelIdToSlug(modelId)
    if (slug) {
      // Ensure scroll to top when navigating to model details
      window.scrollTo(0, 0)
      navigate(`/models/${slug}`)
    }
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {models.map((model) => (
        <div
          key={model.id}
          onClick={() => goConfigure(model.id)}
          className="p-4 border rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-sm hover:border-yellow-500/40 hover:shadow-lg bg-white border-gray-200 text-gray-900 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-100"
          data-model-card="true"
        >
          <div className="text-center">
            {Array.isArray(model.images) && model.images.length > 0 && (
              <img
                src={(model.images.find(i => i.isPrimary)?.url) || model.images[0]?.url}
                alt={model.name}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <h3 className="font-semibold text-lg mb-1">{model.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{model.subtitle}</p>
            <div className="text-2xl font-bold text-yellow-500 mb-3">${Number(model.basePrice || 0).toLocaleString()}</div>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {model.length && (<div>Length: {model.length}</div>)}
              {model.width && (<div>Width: {model.width}</div>)}
              {model.height && (<div>Height: {model.height}</div>)}
              {typeof model.bedrooms === 'number' && (<div>{model.bedrooms} Bedroom{model.bedrooms !== 1 ? 's' : ''}</div>)}
              {typeof model.bathrooms === 'number' && (<div>{model.bathrooms} Bathroom{model.bathrooms !== 1 ? 's' : ''}</div>)}
            </div>
            <button className="btn-primary mt-3">Choose This Home</button>
          </div>
        </div>
      ))}
    </div>
  )
}


