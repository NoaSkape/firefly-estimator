import { useEffect } from 'react'
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { useUser, useAuth, SignUp, SignIn } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import { slugToModelId, isValidSlug } from '../../utils/modelUrlMapping'

export default function AccountCreate() {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { slug: pathSlug } = useParams()
  const location = useLocation()

  // After sign-in: migrate guest draft → Build, then go to /builds/:id
  useEffect(() => {
    (async () => {
      if (!isSignedIn) return
      // derive model info from path param first, fall back to query if present
      const slug = pathSlug || params.get('slug') || ''
      const code = isValidSlug(slug) ? slugToModelId(slug) : slug
      if (!code) { navigate('/models'); return }
      // fetch model data for name and base price
      let model
      try {
        const res = await fetch(`/api/models/${code}`)
        if (res.ok) model = await res.json()
      } catch {}
      
      // Fallback to local models data if API fails
      if (!model) {
        const { MODELS } = await import('../../data/models.js')
        model = MODELS.find(m => m.id === code)
      }
      
      if (!model) { navigate('/models'); return }
      // read guest draft and create a Build
      let guest = null
      try { guest = JSON.parse(localStorage.getItem(`ff_guest_build_${slug}`) || 'null') } catch {}
      
      // Handle package and add-on selections from URL parameters
      const selectedPackage = params.get('pkg')
      const selectedAddon = params.get('addon')
      
      let initialOptions = guest?.selections?.options || []
      
      // Add selected package to options
      if (selectedPackage) {
        // Check model packages first
        let pkg = model?.packages?.find(p => p.key === selectedPackage)
        
        // Fallback to demo packages if not found in model
        if (!pkg) {
          const fallbackPackages = [
            { key:'comfort-xtreme', name:'Comfort Xtreme', priceDelta:3500, description:'HVAC mini‑split, insulation upgrades, blackout shades.' },
            { key:'chefs-pick', name:"Chef's Pick", priceDelta:5200, description:'Solid-surface counters, gas range, deep sink, pull‑outs.' },
            { key:'cozy-cottage', name:'Cozy Cottage', priceDelta:2800, description:'Wood accents, warm lighting, upgraded trim.' },
            { key:'ultra', name:'Ultra', priceDelta:7400, description:'Premium finishes across kitchen, bath and exterior.' },
          ]
          pkg = fallbackPackages.find(p => p.key === selectedPackage)
        }
        
        if (pkg) {
          initialOptions.push({
            id: `pkg-${pkg.key}`,
            name: pkg.name,
            price: Number(pkg.priceDelta || 0),
            description: pkg.description,
            group: 'Packages',
            quantity: 1
          })
        }
      }
      
      // Add selected add-on to options
      if (selectedAddon) {
        // Check model add-ons first
        let addon = model?.addOns?.find(a => a.id === selectedAddon)
        
        // Fallback to demo add-ons if not found in model
        if (!addon) {
          const fallbackAddOns = [
            { id:'awnings', name:'Window Awnings', priceDelta:900, description:'Add charm and shade with custom awnings.' },
            { id:'skylight', name:'Skylight', priceDelta:650, description:'Bring in natural light with a roof skylight.' },
          ]
          addon = fallbackAddOns.find(a => a.id === selectedAddon)
        }
        
        if (addon) {
          initialOptions.push({
            id: `addon-${addon.id}`,
            name: addon.name,
            price: Number(addon.priceDelta || 0),
            description: addon.description,
            group: 'Add-ons',
            quantity: 1
          })
        }
      }
      
      try {
        const token = await getToken()
        const body = {
          modelSlug: slug,
          modelName: model?.name,
          basePrice: Number(model?.basePrice || 0),
          selections: {
            ...guest?.selections,
            options: initialOptions
          },
          financing: guest?.financing || {},
          buyerInfo: guest?.buyerInfo || {},
        }
        const res2 = await fetch('/api/builds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body)
        })
        const json = await res2.json()
        if (json?.buildId) {
          localStorage.removeItem(`ff_guest_build_${slug}`)
          navigate(`/builds/${json.buildId}`)
          return
        }
      } catch {}
      navigate('/builds')
    })()
  }, [isSignedIn, getToken, params, navigate])

  return (
    <div>
      <CheckoutProgress step={2} />
      <div className="max-w-3xl mx-auto">
        {!isSignedIn && (
          <div className="card">
            <h1 className="section-header">Create Your Account</h1>
            <p className="text-sm text-gray-300 mb-4">Sign up to save your design and continue checkout.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
                <h2 className="text-lg font-semibold text-gray-100 mb-2">New to Firefly</h2>
                <SignUp 
                  redirectUrl={location.pathname + location.search} 
                  signInUrl={`/sign-in?redirect=${encodeURIComponent(location.pathname + location.search)}`}
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
                />
              </div>
              <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
                <h2 className="text-lg font-semibold text-gray-100 mb-2">Already have an account?</h2>
                <SignIn 
                  redirectUrl={location.pathname + location.search} 
                  signUpUrl={`/sign-up?redirect=${encodeURIComponent(location.pathname + location.search)}`}
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
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


