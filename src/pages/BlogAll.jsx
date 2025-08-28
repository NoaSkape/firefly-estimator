import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export default function BlogAll() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const postsPerPage = 9

  const categories = [
    "All",
    "Buying Guides",
    "Design & Inspiration", 
    "Financing & Investment",
    "Location & Zoning",
    "Lifestyle & Stories",
    "Sustainability"
  ]

  useEffect(() => {
    fetchPosts()
  }, [currentPage, selectedCategory])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: postsPerPage,
        offset: (currentPage - 1) * postsPerPage
      })
      
      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory)
      }

      console.log('Fetching posts from API...')
      const response = await fetch(`/api/blog?${params}`)
      console.log('API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('API data received:', data)
        
        if (data.posts && data.posts.length > 0) {
          if (currentPage === 1) {
            setPosts(data.posts)
          } else {
            setPosts(prev => [...prev, ...data.posts])
          }
          setHasMore(data.hasMore)
        } else {
          // If API returns empty posts, use sample data
          console.log('API returned empty posts, using sample data')
          setPosts(getSamplePosts())
          setHasMore(false)
        }
      } else {
        // Fallback to sample data if API fails
        console.log('API failed with status:', response.status, 'using sample data')
        setPosts(getSamplePosts())
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      // Fallback to sample data
      console.log('Using sample data due to error')
      setPosts(getSamplePosts())
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const getSamplePosts = () => {
    return [
      {
        id: 1,
        title: "Why Go Tiny? The Complete Guide to Park Model Living",
        excerpt: "Discover the incredible benefits of downsizing to a park model home and why thousands of Americans are choosing this lifestyle.",
        image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Lifestyle & Stories",
        readTime: "12 min read",
        date: "2024-01-15",
        views: 1247,
        slug: "why-go-tiny-complete-guide-park-model-living"
      },
      {
        id: 2,
        title: "Best Skirting Options for Park Model Homes: A Complete Guide",
        excerpt: "Learn about the different skirting options available for park model homes and how to choose the best solution for your needs.",
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Design & Inspiration",
        readTime: "15 min read",
        date: "2024-01-10",
        views: 892,
        slug: "best-skirting-options-park-model-homes"
      },
      {
        id: 3,
        title: "Park Model Regulations and Texas Law: Your Complete Guide",
        excerpt: "Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas.",
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Location & Zoning",
        readTime: "18 min read",
        date: "2024-01-05",
        views: 1563,
        slug: "park-model-regulations-texas-law"
      },
      {
        id: 4,
        title: "Complete Guide to Buying a Park Model Home in 2024",
        excerpt: "Everything you need to know about purchasing your dream park model home, from financing to delivery and setup.",
        image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Buying Guides",
        readTime: "8 min read",
        date: "2024-01-15",
        views: 1247,
        slug: "complete-guide-buying-park-model-home-2024"
      },
      {
        id: 5,
        title: "Park Model vs Tiny House: Which is Right for You?",
        excerpt: "Discover the key differences between park models and tiny houses to make the best choice for your lifestyle.",
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Buying Guides",
        readTime: "6 min read",
        date: "2024-01-10",
        views: 892,
        slug: "park-model-vs-tiny-house-comparison"
      },
      {
        id: 6,
        title: "How to Finance Your Park Model Home: A Complete Guide",
        excerpt: "Explore all your financing options for park model homes, from traditional loans to creative solutions.",
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        category: "Financing & Investment",
        readTime: "10 min read",
        date: "2024-01-05",
        views: 1563,
        slug: "how-to-finance-park-model-home"
      }
    ]
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const loadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  return (
    <>
      <Helmet>
        <title>All Blog Posts | The Tiny Blog | Firefly Tiny Homes</title>
        <meta 
          name="description" 
          content="Browse all our expert articles about park model homes, tiny living, financing, regulations, and more. Find everything you need to know about tiny home living." 
        />
        <meta name="keywords" content="park model homes blog, tiny house articles, tiny living guides, park model financing, tiny home regulations" />
        <link rel="canonical" href="https://fireflyestimator.com/blog/all" />
        
        {/* Open Graph */}
        <meta property="og:title" content="All Blog Posts | The Tiny Blog" />
        <meta property="og:description" content="Browse all our expert articles about park model homes, tiny living, financing, regulations, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fireflyestimator.com/blog/all" />
        <meta property="og:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        <meta property="og:site_name" content="Firefly Tiny Homes" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="All Blog Posts | The Tiny Blog" />
        <meta name="twitter:description" content="Browse all our expert articles about park model homes, tiny living, financing, regulations, and more." />
        <meta name="twitter:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Firefly Tiny Homes" />
        <meta name="language" content="English" />
        <meta name="geo.region" content="US-TX" />
        <meta name="geo.placename" content="Pipe Creek, Texas" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center mb-6">
              <Link 
                to="/blog" 
                className="flex items-center text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 mr-6"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blog
              </Link>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              All Articles
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
              Browse our complete collection of expert articles about park model homes, tiny living, and everything you need to know about the tiny home lifestyle.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent dark:placeholder-gray-400"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 pr-8 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent appearance-none"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading && currentPage === 1 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading articles...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No articles found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post) => (
                  <article key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    <div className="relative">
                      {post.image ? (
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <div className="text-gray-400 dark:text-gray-500">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-yellow-500 text-gray-900 text-sm font-semibold rounded-full">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        <span>{formatDate(post.date)}</span>
                        <span className="mx-2">•</span>
                        <ClockIcon className="w-4 h-4 mr-1" />
                        <span>{post.readTime}</span>
                        <span className="mx-2">•</span>
                        <EyeIcon className="w-4 h-4 mr-1" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 font-semibold group"
                      >
                        Read More
                        <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-8 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Articles'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

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
      </div>
    </>
  )
}
