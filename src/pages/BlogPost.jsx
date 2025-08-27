import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { 
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  TagIcon,
  ShareIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline'

export default function BlogPost() {
  const { slug } = useParams()
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [post, setPost] = useState(null)
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
    loadPost()
  }, [slug])

  const loadPost = async () => {
    try {
      // For now, we'll use sample data. Later this will fetch from API
      const samplePost = {
        id: 1,
        title: "Complete Guide to Buying a Park Model Home in 2024",
        excerpt: "Everything you need to know about purchasing your dream park model home, from financing to delivery and setup.",
        content: `
          <h2>What is a Park Model Home?</h2>
          <p>Park model homes are a unique category of recreational vehicles that offer the perfect blend of mobility and residential comfort. Unlike traditional RVs, park models are designed for extended stays and provide a more home-like experience.</p>
          
          <h2>Key Benefits of Park Model Homes</h2>
          <ul>
            <li><strong>Affordability:</strong> Significantly lower cost compared to traditional homes</li>
            <li><strong>Mobility:</strong> Can be moved to different locations as needed</li>
            <li><strong>Quality:</strong> Built to residential standards with modern amenities</li>
            <li><strong>Community:</strong> Often located in established RV parks and communities</li>
          </ul>
          
          <h2>Understanding the Buying Process</h2>
          <p>The process of buying a park model home involves several key steps that we'll walk you through in detail.</p>
          
          <h3>Step 1: Research and Planning</h3>
          <p>Before making any decisions, it's crucial to understand your needs, budget, and the legal requirements in your area.</p>
          
          <h3>Step 2: Financing Options</h3>
          <p>Park model homes can be financed through various means, including RV loans, personal loans, and specialty financing programs.</p>
          
          <h3>Step 3: Site Selection</h3>
          <p>Finding the right location is essential. Consider factors like zoning laws, community amenities, and long-term plans.</p>
        `,
        featuredImage: "/hero/tiny-home-dusk.png",
        category: "Buying Guide",
        template: "educational",
        readTime: "8 min read",
        date: "2024-01-15",
        views: 1247,
        slug: slug,
        metaDescription: "Complete guide to buying park model homes in 2024. Learn about financing, site selection, and the entire buying process.",
        tags: ["park model homes", "tiny homes", "buying guide", "financing", "2024"],
        author: "Firefly Tiny Homes Team"
      }
      
      setPost(samplePost)
    } catch (error) {
      console.error('Failed to load post:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTemplateIcon = (template) => {
    switch (template) {
      case 'story':
        return BookOpenIcon
      case 'educational':
        return DocumentTextIcon
      case 'inspiration':
        return PaintBrushIcon
      default:
        return DocumentTextIcon
    }
  }

  const getTemplateColor = (template) => {
    switch (template) {
      case 'story':
        return 'bg-blue-500'
      case 'educational':
        return 'bg-green-500'
      case 'inspiration':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist.</p>
          <Link
            to="/blog"
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  const IconComponent = getTemplateIcon(post.template)

  return (
    <>
      <Helmet>
        <title>{post.title} | The Tiny Blog | Firefly Tiny Homes</title>
        <meta 
          name="description" 
          content={post.metaDescription || post.excerpt} 
        />
        <meta name="keywords" content={post.tags.join(', ')} />
        <link rel="canonical" href={`https://fireflyestimator.com/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://fireflyestimator.com/blog/${post.slug}`} />
        <meta property="og:image" content={post.featuredImage} />
        <meta property="og:site_name" content="Firefly Tiny Homes" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt} />
        <meta name="twitter:image" content={post.featuredImage} />
        
        {/* Article Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.metaDescription || post.excerpt,
            "image": post.featuredImage,
            "author": {
              "@type": "Organization",
              "name": post.author
            },
            "publisher": {
              "@type": "Organization",
              "name": "Firefly Tiny Homes",
              "logo": {
                "@type": "ImageObject",
                "url": "https://fireflyestimator.com/logo/firefly-logo.png"
              }
            },
            "datePublished": post.date,
            "dateModified": post.date,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://fireflyestimator.com/blog/${post.slug}`
            }
          })}
        </script>
      </Helmet>

      {/* Admin Edit Button */}
      {isAdmin && (
        <div className="fixed top-20 right-4 z-50">
          <Link
            to={`/blog/edit/${post.id}`}
            className="px-4 py-2 btn-primary rounded-md bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg"
          >
            Edit Post
          </Link>
        </div>
      )}

      {/* Template-specific layouts */}
      {post.template === 'story' && (
        <div className="min-h-screen bg-white">
          {/* Hero Section */}
          <section className="relative h-96">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white max-w-4xl px-4">
                <div className="flex items-center justify-center mb-4">
                  <div className={`w-8 h-8 ${getTemplateColor(post.template)} rounded-lg flex items-center justify-center mr-3`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-yellow-400 font-semibold">{post.category}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
                <p className="text-xl text-gray-200 mb-6">{post.excerpt}</p>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>{post.readTime}</span>
                  </div>
                  <div className="flex items-center">
                    <EyeIcon className="w-4 h-4 mr-1" />
                    <span>{post.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </section>
        </div>
      )}

      {post.template === 'educational' && (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="flex items-center mb-4">
                <Link
                  to="/blog"
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Blog
                </Link>
                <div className={`w-6 h-6 ${getTemplateColor(post.template)} rounded flex items-center justify-center mr-3`}>
                  <IconComponent className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-600">{post.category}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
              <p className="text-lg text-gray-600 mb-6">{post.excerpt}</p>
              
              <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  <span>{formatDate(post.date)}</span>
                </div>
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  <span>{post.readTime}</span>
                </div>
                <div className="flex items-center">
                  <EyeIcon className="w-4 h-4 mr-1" />
                  <span>{post.views.toLocaleString()} views</span>
                </div>
              </div>

              {post.featuredImage && (
                <img 
                  src={post.featuredImage} 
                  alt={post.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Content with Sidebar */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm p-8">
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                  <h3 className="font-semibold text-gray-900 mb-4">Table of Contents</h3>
                  <nav className="space-y-2">
                    <a href="#what-is" className="block text-sm text-gray-600 hover:text-yellow-600">What is a Park Model Home?</a>
                    <a href="#benefits" className="block text-sm text-gray-600 hover:text-yellow-600">Key Benefits</a>
                    <a href="#process" className="block text-sm text-gray-600 hover:text-yellow-600">Buying Process</a>
                  </nav>
                  
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {post.template === 'inspiration' && (
        <div className="min-h-screen bg-white">
          {/* Hero with Large Image */}
          <section className="relative h-screen">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-4">
                  <div className={`w-8 h-8 ${getTemplateColor(post.template)} rounded-lg flex items-center justify-center mr-3`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-yellow-400 font-semibold">{post.category}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{post.title}</h1>
                <p className="text-xl text-gray-200 mb-6 max-w-2xl">{post.excerpt}</p>
                <div className="flex items-center gap-6 text-sm text-gray-300">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </section>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Your Tiny Home Journey?
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            Explore our park model homes and find your perfect match.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/models"
              className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800"
            >
              Explore Park Models
            </Link>
            <Link
              to="/how"
              className="inline-flex items-center px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
