import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import AdminBlogEditor from '../components/AdminBlogEditor'

export default function BlogPost() {
  const { slug } = useParams()
  const { user } = useUser()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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
    const fetchPost = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/blog/${slug}`)
        if (!response.ok) {
          throw new Error('Post not found')
        }
        const data = await response.json()
        setPost(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchPost()
    }
  }, [slug])

  const handleEdit = () => {
    setIsEditorOpen(true)
  }

  const handleSaved = (savedPost) => {
    setPost(savedPost)
    setIsEditorOpen(false)
  }

  const handleClose = () => {
    setIsEditorOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog" className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors">
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  const generateBlogSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.metaDescription || post.excerpt,
      "image": post.featuredImage?.url,
      "author": {
        "@type": "Organization",
        "name": "Firefly Tiny Homes",
        "url": "https://fireflyestimator.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Firefly Tiny Homes",
        "logo": {
          "@type": "ImageObject",
          "url": "https://fireflyestimator.com/logo/firefly-logo.png"
        }
      },
      "datePublished": post.publishDate,
      "dateModified": post.updatedAt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://fireflyestimator.com/blog/${post.slug}`
      },
      "keywords": post.tags?.join(', '),
      "articleSection": post.category
    }
  }

  const renderTemplate = () => {
    switch (post.template) {
      case 'story-driven':
        return (
          <article className="max-w-4xl mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="mb-12">
              {post.featuredImage?.url && (
                <div className="relative h-96 mb-8 rounded-2xl overflow-hidden">
                  <img 
                    src={post.featuredImage.url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
              )}
              <div className="text-center">
                <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  {post.category}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  {post.title}
                </h1>
                <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <span>By Firefly Tiny Homes</span>
                  <span>•</span>
                  <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.views || 0} views</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        )

      case 'educational':
        return (
          <article className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                  {post.category}
                </div>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500">{new Date(post.publishDate).toLocaleDateString()}</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {post.title}
              </h1>
              
              {post.featuredImage?.url && (
                <div className="relative h-80 mb-8 rounded-xl overflow-hidden">
                  <img 
                    src={post.featuredImage.url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-8">
                <p className="text-lg text-gray-700 font-medium">
                  {post.excerpt}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Author Box */}
            <div className="mt-12 p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  F
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Firefly Tiny Homes</h3>
                  <p className="text-gray-600">Your trusted partner in tiny home living</p>
                </div>
              </div>
            </div>
          </article>
        )

      case 'inspiration':
        return (
          <article className="max-w-4xl mx-auto px-4 py-8">
            {/* Hero with Background */}
            <div className="relative mb-12">
              {post.featuredImage?.url && (
                <div className="absolute inset-0 h-96 rounded-2xl overflow-hidden">
                  <img 
                    src={post.featuredImage.url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                </div>
              )}
              
              <div className="relative z-10 h-96 flex items-end p-8">
                <div className="text-white">
                  <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-medium mb-4">
                    {post.category}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    {post.title}
                  </h1>
                  <p className="text-xl text-gray-200 max-w-2xl">
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Call to Action */}
            <div className="mt-12 p-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl text-center">
              <h3 className="text-2xl font-bold text-yellow-900 mb-4">
                Ready to Start Your Tiny Home Journey?
              </h3>
              <p className="text-yellow-800 mb-6">
                Explore our collection of park model homes and find your perfect match.
              </p>
              <Link 
                to="/models" 
                className="inline-block bg-white text-yellow-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Browse Our Models
              </Link>
            </div>
          </article>
        )

      default:
        return (
          <article className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
          </article>
        )
    }
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Firefly Tiny Homes Blog</title>
        <meta name="description" content={post.metaDescription || post.excerpt} />
        <meta name="keywords" content={post.tags?.join(', ')} />
        <link rel="canonical" href={`https://fireflyestimator.com/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://fireflyestimator.com/blog/${post.slug}`} />
        <meta property="og:image" content={post.featuredImage?.url} />
        <meta property="og:site_name" content="Firefly Tiny Homes" />
        <meta property="article:published_time" content={post.publishDate} />
        <meta property="article:modified_time" content={post.updatedAt} />
        <meta property="article:section" content={post.category} />
        {post.tags?.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt} />
        <meta name="twitter:image" content={post.featuredImage?.url} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Firefly Tiny Homes" />
        <meta name="language" content="English" />
        <meta name="geo.region" content="US-TX" />
        <meta name="geo.placename" content="Texas" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateBlogSchema())}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Admin Edit Button */}
        {isAdmin && (
          <div className="fixed top-20 right-4 z-50">
            <button
              onClick={handleEdit}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-yellow-700 transition-colors"
            >
              Edit Post
            </button>
          </div>
        )}

        {/* Back to Blog */}
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-yellow-600 hover:text-yellow-700 mb-8"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>
        </div>

        {/* Blog Content */}
        {renderTemplate()}
      </div>

      {/* Admin Editor Modal */}
      {isEditorOpen && (
        <AdminBlogEditor
          post={post}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
