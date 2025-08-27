import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { Seo } from '../components/Seo'
import AdminPageEditor from '../components/AdminPageEditor'

export default function About() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [pageContent, setPageContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    loadPageContent()
  }, [])

  const loadPageContent = async () => {
    try {
      const response = await fetch('/api/pages/about')
      if (response.ok) {
        const data = await response.json()
        setPageContent(data)
      } else {
        // Fallback to default content
        setPageContent({
          pageId: 'about',
          content: {
            hero: {
              title: 'About Firefly Tiny Homes',
              subtitle: 'Texas\'s online dealership for Champion Park Model Homes—built for transparency, speed, and savings.'
            },
            story: {
              title: 'Our Story',
              content: 'Firefly Tiny Homes was founded to make park model home buying simple and modern. Instead of a large sales lot with high overhead, we built a streamlined online experience that connects you directly with the factory. The result: faster timelines, transparent pricing, and real savings.'
            },
            benefits: {
              title: 'Why Online Saves You Money',
              content: 'Lower overhead vs traditional dealerships, no hidden lot fees or surprise markups, factory-direct scheduling and communication, digital contracts and payments for a faster close.'
            },
            comparison: {
              title: 'Traditional Dealer vs Firefly',
              content: 'Traditional: high lot overhead, slow quotes, salesperson pressure. Firefly: transparent pricing, online design, expert help when you want it. Traditional: paper contracts and weeks of back‑and‑forth. Firefly: digital e‑sign + payment—secure and convenient.'
            },
            location: {
              title: 'Proudly Serving the Texas Hill Country',
              content: 'Based in Pipe Creek, our team supports customers across Texas—from design through delivery and setup. Visit our FAQ, explore models, or contact us for help.'
            }
          },
          images: {}
        })
      }
    } catch (error) {
      console.error('Failed to load page content:', error)
      // Fallback to default content
      setPageContent({
        pageId: 'about',
        content: {
          hero: {
            title: 'About Firefly Tiny Homes',
            subtitle: 'Texas\'s online dealership for Champion Park Model Homes—built for transparency, speed, and savings.'
          },
          story: {
            title: 'Our Story',
            content: 'Firefly Tiny Homes was founded to make park model home buying simple and modern. Instead of a large sales lot with high overhead, we built a streamlined online experience that connects you directly with the factory. The result: faster timelines, transparent pricing, and real savings.'
          },
          benefits: {
            title: 'Why Online Saves You Money',
            content: 'Lower overhead vs traditional dealerships, no hidden lot fees or surprise markups, factory-direct scheduling and communication, digital contracts and payments for a faster close.'
          },
          comparison: {
            title: 'Traditional Dealer vs Firefly',
            content: 'Traditional: high lot overhead, slow quotes, salesperson pressure. Firefly: transparent pricing, online design, expert help when you want it. Traditional: paper contracts and weeks of back‑and‑forth. Firefly: digital e‑sign + payment—secure and convenient.'
          },
          location: {
            title: 'Proudly Serving the Texas Hill Country',
            content: 'Based in Pipe Creek, our team supports customers across Texas—from design through delivery and setup. Visit our FAQ, explore models, or contact us for help.'
          }
        },
        images: {}
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContentSaved = (updatedContent) => {
    setPageContent(updatedContent)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  const content = pageContent?.content || {}

  return (
    <>
      <Seo
        title="About Firefly Tiny Homes | Online Park Model Dealership"
        description="Firefly Tiny Homes is Texas's online dealership for Champion Park Models. Learn how buying online saves you thousands with transparent pricing and modern service."
      />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Admin Edit Button */}
        {isAdmin && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-3 py-2 btn-primary rounded-md"
            >
              Edit
            </button>
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            {content.hero?.title || 'About Firefly Tiny Homes'}
          </h1>
          <p className="mt-2 text-gray-300">
            {content.hero?.subtitle || 'Texas\'s online dealership for Champion Park Model Homes—built for transparency, speed, and savings.'}
          </p>
        </header>

        {content.story && (
          <section className="card">
            <h2 className="text-lg font-semibold text-gray-100">{content.story.title}</h2>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              {content.story.content}
            </p>
          </section>
        )}

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {content.benefits && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-100">{content.benefits.title}</h3>
              <ul className="mt-3 text-sm text-gray-300 list-disc list-inside space-y-1">
                {content.benefits.content.split('. ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {content.comparison && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-100">{content.comparison.title}</h3>
              <ul className="mt-3 text-sm text-gray-300 list-disc list-inside space-y-1">
                {content.comparison.content.split('. ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {content.location && (
          <section className="mt-6 card">
            <h3 className="text-base font-semibold text-gray-100">{content.location.title}</h3>
            <p className="mt-2 text-sm text-gray-300">
              {content.location.content}
            </p>
          </section>
        )}


      </div>

      {/* Admin Editor */}
              {isEditorOpen && (
          <AdminPageEditor
            pageId="about"
            content={pageContent?.content}
            images={pageContent?.images}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleContentSaved}
            imageFields={[
              { name: 'heroImage', label: 'Hero Background Image' },
              { name: 'storyImage', label: 'Our Story Image' },
              { name: 'benefitsImage', label: 'Benefits Section Image' },
              { name: 'comparisonImage', label: 'Comparison Section Image' },
              { name: 'locationImage', label: 'Location Section Image' }
            ]}
          />
        )}
    </>
  )
}


