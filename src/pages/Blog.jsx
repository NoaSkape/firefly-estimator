import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../utils/canEditModels'
import { 
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  BookOpenIcon,
  SparklesIcon,
  HomeIcon,
  PaintBrushIcon,
  CurrencyDollarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

export default function Blog() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await canEditModelsClient()
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault()
    if (!newsletterEmail) return

    setIsSubscribing(true)
    // TODO: Implement newsletter signup
    setTimeout(() => {
      setIsSubscribing(false)
      setNewsletterEmail('')
      alert('Thank you for subscribing to The Tiny Blog!')
    }, 1000)
  }

  // Featured blog posts (will be fetched from API later)
  const featuredPosts = [
    {
      id: 1,
      title: "Complete Guide to Buying a Park Model Home in 2024",
      excerpt: "Everything you need to know about purchasing your dream park model home, from financing to delivery and setup.",
      image: "/hero/tiny-home-dusk.png",
      category: "Buying Guide",
      readTime: "8 min read",
      date: "2024-01-15",
      views: 1247,
      slug: "complete-guide-buying-park-model-home-2024"
    },
    {
      id: 2,
      title: "Park Model vs Tiny House: Which is Right for You?",
      excerpt: "Discover the key differences between park models and tiny houses to make the best choice for your lifestyle.",
      image: "/hero/champion-park-model-exterior.jpg",
      category: "Comparison",
      readTime: "6 min read",
      date: "2024-01-10",
      views: 892,
      slug: "park-model-vs-tiny-house-comparison"
    },
    {
      id: 3,
      title: "How to Finance Your Park Model Home: A Complete Guide",
      excerpt: "Explore all your financing options for park model homes, from traditional loans to creative solutions.",
      image: "/hero/tiny-home-dusk.png",
      category: "Financing",
      readTime: "10 min read",
      date: "2024-01-05",
      views: 1563,
      slug: "how-to-finance-park-model-home"
    }
  ]

  const categories = [
    {
      name: "Buying Guides",
      icon: HomeIcon,
      description: "Complete guides to purchasing park model homes",
      color: "bg-blue-500",
      count: 12
    },
    {
      name: "Design & Inspiration",
      icon: PaintBrushIcon,
      description: "Interior and exterior design ideas",
      color: "bg-purple-500",
      count: 8
    },
    {
      name: "Financing & Investment",
      icon: CurrencyDollarIcon,
      description: "Money-saving and investment strategies",
      color: "bg-green-500",
      count: 6
    },
    {
      name: "Location & Zoning",
      icon: MapPinIcon,
      description: "Legal and placement information",
      color: "bg-orange-500",
      count: 4
    },
    {
      name: "Lifestyle & Stories",
      icon: BookOpenIcon,
      description: "Real tiny home living experiences",
      color: "bg-pink-500",
      count: 15
    },
    {
      name: "Sustainability",
      icon: SparklesIcon,
      description: "Eco-friendly living and green features",
      color: "bg-teal-500",
      count: 7
    }
  ]

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <Helmet>
        <title>The Tiny Blog | Your Ultimate Guide to Park Model Living | Firefly Tiny Homes</title>
        <meta 
          name="description" 
          content="Expert insights, real stories, and everything you need to know about tiny homes, park models, and sustainable living. Join thousands of tiny home enthusiasts." 
        />
        <meta name="keywords" content="tiny home blog, park model homes, tiny house living, tiny home design, tiny house cost, park model guide" />
        <link rel="canonical" href="https://fireflyestimator.com/blog" />
        
        {/* Open Graph */}
        <meta property="og:title" content="The Tiny Blog | Your Ultimate Guide to Park Model Living" />
        <meta property="og:description" content="Expert insights, real stories, and everything you need to know about tiny homes, park models, and sustainable living." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fireflyestimator.com/blog" />
        <meta property="og:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        <meta property="og:site_name" content="Firefly Tiny Homes" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Tiny Blog | Your Ultimate Guide to Park Model Living" />
        <meta name="twitter:description" content="Expert insights, real stories, and everything you need to know about tiny homes, park models, and sustainable living." />
        <meta name="twitter:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Firefly Tiny Homes" />
        <meta name="language" content="English" />
        <meta name="geo.region" content="US-TX" />
        <meta name="geo.placename" content="Pipe Creek, Texas" />
      </Helmet>

      {/* Admin Create Post Button */}
      {isAdmin && (
        <div className="fixed top-20 right-4 z-50">
          <Link
            to="/blog/create"
            className="px-4 py-2 btn-primary rounded-md bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg"
          >
            Create Post
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 lg:py-32">
        <div className="absolute inset-0">
          <img 
            src="/hero/tiny-home-dusk.png" 
            alt="Tiny home at sunset" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-gray-900/30" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <SparklesIcon className="w-8 h-8 text-yellow-400 mr-3" />
            <span className="text-yellow-400 font-semibold text-lg">The Tiny Blog</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Your Ultimate Guide to
            <span className="text-yellow-400"> Park Model Living</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-4xl mx-auto leading-relaxed">
            Expert insights, real stories, and everything you need to know about tiny homes, 
            park models, and sustainable living. Join thousands of tiny home enthusiasts.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="flex items-center text-gray-300">
              <BookOpenIcon className="w-5 h-5 mr-2" />
              <span>50+ Expert Articles</span>
            </div>
            <div className="flex items-center text-gray-300">
              <EyeIcon className="w-5 h-5 mr-2" />
              <span>25K+ Monthly Readers</span>
            </div>
            <div className="flex items-center text-gray-300">
              <CalendarIcon className="w-5 h-5 mr-2" />
              <span>Updated Weekly</span>
            </div>
          </div>
          
          {/* Newsletter Signup */}
          <div className="max-w-md mx-auto">
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Get weekly tiny home insights..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="px-6 py-3 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            <p className="text-sm text-gray-400 mt-2">
              Join 2,500+ tiny home enthusiasts. No spam, unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Featured Articles
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Start your tiny home journey with our most popular and comprehensive guides
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="relative">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-yellow-500 text-gray-900 text-sm font-semibold rounded-full">
                      {post.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>{formatDate(post.date)}</span>
                    <span className="mx-2">•</span>
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>{post.readTime}</span>
                    <span className="mx-2">•</span>
                    <EyeIcon className="w-4 h-4 mr-1" />
                    <span>{post.views.toLocaleString()}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center text-yellow-600 hover:text-yellow-700 font-semibold group"
                  >
                    Read More
                    <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link
              to="/blog/all"
              className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              View All Articles
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Explore by Category
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Find exactly what you're looking for with our organized content categories
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <Link
                  key={category.name}
                  to={`/blog/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">
                        {category.name}
                      </h3>
                      <span className="text-sm text-gray-500">{category.count} articles</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {category.description}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Ready to Start Your Tiny Home Journey?
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            Explore our park model homes and find your perfect match. 
            Order online in under an hour with our streamlined process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/models"
              className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Explore Park Models
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/how"
              className="inline-flex items-center px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
