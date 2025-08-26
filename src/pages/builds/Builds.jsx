import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth, SignUp, SignIn } from '@clerk/clerk-react'
import { Helmet } from 'react-helmet-async'
import CheckoutProgress from '../../components/CheckoutProgress'
import RenameModal from '../../components/RenameModal'
import { useToast } from '../../components/ToastProvider'
import { calculateTotalPurchasePrice } from '../../utils/calculateTotal'
import { slugToModelId } from '../../utils/modelUrlMapping'
import { MODELS } from '../../data/models'
import { 
  ChevronDownIcon, 
  XMarkIcon,
  HomeIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

// Function to get the correct route based on build step
const getBuildStepRoute = (build) => {
  const step = build.step || 1
  
  // Map step numbers to routes
  switch (step) {
    case 1: // Choose Your Home
      return `/models`
    case 2: // Customize!
      return `/customize/${build.modelSlug}`
    case 3: // Sign In
      return `/sign-in?redirect=${encodeURIComponent(`/checkout/${build._id}/buyer`)}`
    case 4: // Delivery Address
      return `/checkout/${build._id}/buyer`
    case 5: // Overview
      return `/checkout/${build._id}/review`
    case 6: // Payment Method
      return `/checkout/${build._id}/payment-method`
    case 7: // Contract
      return `/checkout/${build._id}/agreement`
    case 8: // Confirmation
      return `/checkout/${build._id}/confirm`
    default:
      return `/checkout/${build._id}/review` // Default to overview
  }
}

export default function BuildsDashboard() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [builds, setBuilds] = useState([])
  const [settings, setSettings] = useState(null)
  const [models, setModels] = useState([])
  const [renameModal, setRenameModal] = useState({ isOpen: false, build: null })
  const [sortBy, setSortBy] = useState('newest')
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    // Check sessionStorage to see if banner was dismissed this session
    return sessionStorage.getItem('myHomeTipDismissed') !== 'true'
  })
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Sort builds based on selected option
  const sortBuilds = (buildsArray) => {
    switch (sortBy) {
      case 'newest':
        return [...buildsArray].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      case 'oldest':
        return [...buildsArray].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
      case 'price-high':
        return [...buildsArray].sort((a, b) => calculateTotalPurchasePrice(b, settings) - calculateTotalPurchasePrice(a, settings))
      case 'price-low':
        return [...buildsArray].sort((a, b) => calculateTotalPurchasePrice(a, settings) - calculateTotalPurchasePrice(b, settings))
      default:
        return buildsArray
    }
  }

  // Get model thumbnail URL from actual model data
  const getModelThumbnail = (build) => {
    if (!build.modelSlug) return '/hero/tiny-home-dusk.png'
    
    // Convert slug to model code
    const modelCode = slugToModelId(build.modelSlug)
    if (!modelCode) return '/hero/tiny-home-dusk.png'
    
    // Find the model in our models array
    const model = models.find(m => m.id === modelCode || m.modelCode === modelCode)
    if (!model || !Array.isArray(model.images) || model.images.length === 0) {
      return '/hero/tiny-home-dusk.png'
    }
    
    // Use primary image or first image
    const primaryImage = model.images.find(img => img.isPrimary)
    const imageUrl = primaryImage?.url || model.images[0]?.url
    
    return imageUrl || '/hero/tiny-home-dusk.png'
  }

  // Handle dismissing the info banner
  const dismissInfoBanner = () => {
    setShowInfoBanner(false)
    sessionStorage.setItem('myHomeTipDismissed', 'true')
  }

  // Load settings and models
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        const settingsRes = await fetch('/api/admin/settings', { headers })
        if (settingsRes.ok) {
          setSettings(await settingsRes.json())
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    const loadModels = async () => {
      try {
        // Start with local models
        const local = MODELS.map(m => ({ ...m }))
        setModels(local)
        
        // Fetch each model individually to get images and updated data
        const responses = await Promise.all(local.map(m => fetch(`/api/models/${m.id}`)))
        const apiModels = await Promise.all(responses.map(r => (r.ok ? r.json() : null)))
        
        const merged = local.map((m, i) => {
          const api = apiModels[i]
          if (!api) return m
          return {
            ...m,
            name: api.name || m.name,
            description: api.description ?? m.description,
            basePrice: typeof api.basePrice === 'number' ? api.basePrice : m.basePrice,
            width: api?.width ?? null,
            length: api?.length ?? null,
            height: api?.height ?? null,
            weight: api?.weight ?? null,
            bedrooms: api?.bedrooms ?? null,
            bathrooms: api?.bathrooms ?? null,
            squareFeet: api?.squareFeet ?? null,
            images: Array.isArray(api.images) ? api.images : [],
            subtitle: api.modelCode || m.subtitle,
          }
        })
        
        setModels(merged)
      } catch (error) {
        console.error('Error loading models:', error)
        // Fallback to local models if API fails
        setModels(MODELS.map(m => ({ ...m })))
      }
    }
    
    if (isSignedIn) {
      loadSettings()
    }
    loadModels()
  }, [isSignedIn, getToken])

  useEffect(() => {
    console.log('[BuildsDashboard] useEffect triggered:', { isSignedIn, loading })
    
    // If not signed in, stop loading immediately
    if (!isSignedIn) { 
      console.log('[BuildsDashboard] Not signed in, setting loading to false')
      setLoading(false); 
      return 
    }

    // Start fetching builds immediately when signed in
    let isMounted = true;
    (async () => {
      try {
        console.log('[BuildsDashboard] Fetching builds...')
        const token = await getToken()
        const res = await fetch('/api/builds', { 
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          // Add cache control to ensure fresh data
          cache: 'no-cache'
        })
        
        if (!isMounted) return; // Component unmounted
        
        if (res.ok) {
          const buildsData = await res.json()
          console.log('[BuildsDashboard] Builds fetched successfully:', buildsData.length)
          setBuilds(buildsData)
        } else {
          console.error('[BuildsDashboard] Failed to fetch builds:', res.status, res.statusText)
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[BuildsDashboard] Error fetching builds:', error)
      } finally { 
        if (isMounted) {
          console.log('[BuildsDashboard] Setting loading to false')
          setLoading(false) 
        }
      }
    })()

    return () => {
      isMounted = false;
    }
  }, [isSignedIn])

  // Wait for Clerk to finish loading before making authentication decisions
  if (!isLoaded) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="section-header">My Home</h1>
          <p className="text-lg text-gray-300 mb-6">Create an account to save and customize your home</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-2">New to Firefly</h2>
              <SignUp 
                fallbackRedirectUrl="/builds" 
                afterSignInUrl="/builds"
                signInUrl="/sign-in?redirect=/builds"
                appearance={{
                  elements: {
                    formButtonPrimary: 'btn-primary w-full',
                    card: 'bg-transparent shadow-none p-0',
                    headerTitle: 'text-lg font-semibold text-gray-100',
                    headerSubtitle: 'text-gray-400',
                    formFieldInput: 'w-full px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent',
                    formFieldLabel: 'block text-sm font-medium text-gray-300 mb-1',
                    footerActionLink: 'text-yellow-400 hover:text-yellow-300'
                  }
                }}
                onError={(error) => {
                  console.error('Builds SignUp error:', error)
                  // Use toast for error handling
                  const { addToast } = require('../../components/ToastProvider').useToast()
                  addToast({
                    type: 'error',
                    title: 'Sign Up Error',
                    message: 'Unable to create account. Please try again.',
                    duration: 6000
                  })
                }}
              />
            </div>
            <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-2">Already have an account?</h2>
              <SignIn 
                fallbackRedirectUrl="/builds" 
                afterSignUpUrl="/builds"
                signUpUrl="/sign-up?redirect=/builds"
                appearance={{
                  elements: {
                    formButtonPrimary: 'btn-primary w-full',
                    card: 'bg-transparent shadow-none p-0',
                    headerTitle: 'text-lg font-semibold text-gray-100',
                    headerSubtitle: 'text-gray-400',
                    formFieldInput: 'w-full px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent',
                    formFieldLabel: 'block text-sm font-medium text-gray-300 mb-1',
                    footerActionLink: 'text-yellow-400 hover:text-yellow-300'
                  }
                }}
                onError={(error) => {
                  console.error('Builds SignIn error:', error)
                  // Use toast for error handling
                  const { addToast } = require('../../components/ToastProvider').useToast()
                  addToast({
                    type: 'error',
                    title: 'Sign In Error',
                    message: 'Unable to sign in. Please check your credentials and try again.',
                    duration: 6000
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sortedBuilds = sortBuilds(builds)

  return (
    <>
      <Helmet>
        <title>My Home – Saved Tiny House Designs | Firefly Tiny Homes</title>
        <meta name="description" content="Return to your saved tiny home designs anytime. Resume, customize, or checkout your builds instantly with Firefly Tiny Homes' online dealership platform." />
        <meta name="keywords" content="saved tiny home designs, customize your tiny house online, resume your tiny home build, buy a tiny house online" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-yellow-500 mb-4">
            My Home – Your Saved Tiny House Designs
          </h1>
          <h2 className="text-xl text-white mb-6">
            Easily access, edit, and complete your tiny home builds anytime.
          </h2>
          
          {/* SEO Introduction Paragraph */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
            <p className="text-gray-300 leading-relaxed">
              This is your personal hub for managing all of your saved tiny home designs. 
              Every time you customize your tiny house online, it's stored here so you can 
              return later, compare different builds, or complete your purchase. With Firefly Tiny Homes, you can 
              order your home online in under an hour!
            </p>
          </div>

          {/* Info Banner */}
          {showInfoBanner && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex items-start justify-between">
              <div className="flex items-start">
                <div>
                  <p className="text-white text-sm">
                    💡 Tip: You can create and save as many designs as you like. 
                    Compare different layouts, experiment with options, and come back anytime to finish your purchase.
                  </p>
                </div>
              </div>
              <button 
                onClick={dismissInfoBanner}
                className="text-yellow-500/60 hover:text-yellow-500 ml-4"
                aria-label="Close tip banner"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Sort & Filter Controls */}
        {!loading && builds.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-400">
              {builds.length} saved design{builds.length !== 1 ? 's' : ''}
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-600 text-white px-4 py-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>
              <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loading skeleton */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-700 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-700 rounded w-20"></div>
                      <div className="h-8 bg-gray-700 rounded w-20"></div>
                      <div className="h-8 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : builds.length === 0 ? (
          <div className="text-center py-12">
            <HomeIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No saved designs yet</h3>
            <p className="text-gray-400 mb-6">Start by exploring our tiny home models and creating your first custom design.</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/models')}
            >
              Explore Models
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedBuilds.map(build => (
              <div 
                key={build._id} 
                className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 hover:shadow-xl hover:border-gray-600 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start space-x-4 mb-4">
                  {/* Model Thumbnail */}
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                      src={getModelThumbnail(build)}
                      alt={`Saved tiny home design – ${build.modelName || build.modelSlug} model`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Build Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-white truncate">
                        {build.modelName || build.modelSlug}
                      </h3>
                      {build.primary && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-400 text-black font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                      <span className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        Step {build.step}/8
                      </span>
                      <span className="flex items-center">
                        <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                        ${calculateTotalPurchasePrice(build, settings).toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {new Date(build.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 capitalize mb-4">
                      Status: {build.status}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="btn-primary text-sm px-4 py-2"
                    onClick={() => navigate(getBuildStepRoute(build))}
                    title="Pick up where you left off"
                    aria-label={`Resume saved home build for ${build.modelName || build.modelSlug}`}
                  >
                    Resume
                  </button>
                  
                  <button 
                    className="px-3 py-2 text-sm rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                    onClick={async() => { 
                      const token = await getToken(); 
                      const r = await fetch(`/api/builds/${build._id}/duplicate`, { 
                        method:'POST', 
                        headers: token ? { Authorization: `Bearer ${token}` } : {} 
                      }); 
                      const j = await r.json(); 
                      if(j?.buildId) navigate(`/builds/${j.buildId}`)
                    }}
                    title="Make a copy and try a new customization"
                    aria-label={`Duplicate ${build.modelName || build.modelSlug} design`}
                  >
                    Duplicate
                  </button>
                  
                  <button 
                    className="px-3 py-2 text-sm rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                    onClick={async() => { 
                      const token = await getToken(); 
                      await fetch(`/api/builds/${build._id}`, { 
                        method:'PATCH', 
                        headers: { 
                          'Content-Type':'application/json', 
                          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
                        }, 
                        body: JSON.stringify({ primary: true }) 
                      }); 
                      setBuilds(list => list.map(x => ({ ...x, primary: x._id === build._id })))
                    }}
                    title="Mark this as your main design"
                    aria-label={`Set ${build.modelName || build.modelSlug} as primary design`}
                  >
                    Set Primary
                  </button>
                  
                  <button 
                    className="px-3 py-2 text-sm rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                    onClick={() => setRenameModal({ isOpen: true, build })}
                    title="Give this design a custom name"
                    aria-label={`Rename ${build.modelName || build.modelSlug} design`}
                  >
                    Rename
                  </button>
                  
                  <button 
                    className="px-3 py-2 text-sm rounded border border-red-800 text-red-300 hover:bg-red-900/30 transition-colors"
                    onClick={async() => { 
                      const token = await getToken(); 
                      await fetch(`/api/builds/${build._id}`, { 
                        method:'DELETE', 
                        headers: token ? { Authorization: `Bearer ${token}` } : {} 
                      }); 
                      setBuilds(list => list.filter(x => x._id !== build._id)); 
                      
                      // Check if we're currently on this build's pages and redirect
                      const currentPath = window.location.pathname;
                      if (currentPath.includes(`/builds/${build._id}`) || currentPath.includes(`/checkout/${build._id}`)) { 
                        addToast({ 
                          type: 'warning', 
                          title: 'Build Deleted',
                          message: 'The build you were viewing has been deleted. Redirected to My Builds.'
                        });
                        navigate('/builds') 
                      } else {
                        addToast({ 
                          type: 'success', 
                          title: 'Build Deleted',
                          message: 'Build has been successfully deleted.'
                        });
                      }
                    }}
                    title="Remove this saved build"
                    aria-label={`Delete ${build.modelName || build.modelSlug} design`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <RenameModal
        build={renameModal.build}
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, build: null })}
        onRenamed={(updatedBuild) => {
          setBuilds(list => list.map(b => b._id === updatedBuild._id ? updatedBuild : b))
        }}
      />
    </>
  )
}


