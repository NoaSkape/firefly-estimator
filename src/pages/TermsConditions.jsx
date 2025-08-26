import { Helmet } from 'react-helmet-async'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function TermsConditions() {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch('/api/policies/terms-conditions')
        if (response.ok) {
          const data = await response.json()
          setPolicy(data)
        } else {
          setError('Failed to load terms & conditions')
        }
      } catch (err) {
        console.error('Failed to load terms & conditions:', err)
        setError('Failed to load terms & conditions')
      } finally {
        setLoading(false)
      }
    }

    loadPolicy()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-300 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-red-500 text-center">
          <p>Error loading terms & conditions: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Helmet>
        <title>Terms & Conditions - Firefly Tiny Homes</title>
        <meta name="description" content="Firefly Tiny Homes Terms & Conditions for website use and purchases." />
      </Helmet>

      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-gray-100 mb-8">{policy?.title || 'Terms & Conditions'}</h1>
        
        <div className="prose prose-lg prose-invert max-w-none">
          <ReactMarkdown 
            components={{
              h1: ({children}) => <h1 className="text-3xl font-bold text-gray-100 mt-8 mb-4">{children}</h1>,
              h2: ({children}) => <h2 className="text-2xl font-semibold text-gray-100 mt-8 mb-4">{children}</h2>,
              h3: ({children}) => <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">{children}</h3>,
              p: ({children}) => <p className="text-gray-300 mb-6">{children}</p>,
              ul: ({children}) => <ul className="text-gray-300 space-y-2 mb-6 list-disc pl-6">{children}</ul>,
              ol: ({children}) => <ol className="text-gray-300 space-y-2 mb-6 list-decimal pl-6">{children}</ol>,
              li: ({children}) => <li className="text-gray-300">{children}</li>,
              strong: ({children}) => <strong className="text-gray-100 font-semibold">{children}</strong>,
              em: ({children}) => <em className="text-gray-300 italic">{children}</em>,
            }}
          >
            {policy?.content || ''}
          </ReactMarkdown>
        </div>

        {policy?.lastUpdated && (
          <div className="mt-8 pt-4 border-t border-gray-700 text-sm text-gray-400">
            Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  )
}
