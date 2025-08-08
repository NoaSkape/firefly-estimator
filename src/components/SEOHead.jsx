import { useEffect } from 'react'

const SEOHead = ({ title, description, model }) => {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description)
    } else if (description) {
      // Create meta description if it doesn't exist
      const newMetaDescription = document.createElement('meta')
      newMetaDescription.name = 'description'
      newMetaDescription.content = description
      document.head.appendChild(newMetaDescription)
    }

    // Add structured data for rich snippets
    if (model) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: model.name,
        description: model.description || `Explore the ${model.name} tiny home model`,
        brand: {
          '@type': 'Brand',
          name: 'Firefly Tiny Homes'
        },
        offers: {
          '@type': 'Offer',
          price: model.basePrice,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock'
        }
      }

      // Remove existing structured data
      const existingScript = document.querySelector('script[data-structured-data="model"]')
      if (existingScript) {
        existingScript.remove()
      }

      // Add new structured data
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-structured-data', 'model')
      script.textContent = JSON.stringify(structuredData)
      document.head.appendChild(script)
    }

    // Cleanup function
    return () => {
      const script = document.querySelector('script[data-structured-data="model"]')
      if (script) {
        script.remove()
      }
    }
  }, [title, description, model])

  return null
}

export default SEOHead 