import { useEffect } from 'react'
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { useUser, useAuth, SignUp, SignIn } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import { slugToModelId, isValidSlug } from '../../utils/modelUrlMapping'

export default function AccountCreate() {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { slug: pathSlug } = useParams()
  const location = useLocation()

  // Ensure we create a draft order once the user is signed in
  useEffect(() => {
    (async () => {
      if (!isSignedIn) return
      if (localStorage.getItem('ff.orderId')) {
        navigate('/checkout/buyer')
        return
      }
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
      if (!model) { navigate('/models'); return }
      try {
        const token = await getToken()
        const key = `${Date.now()}-${user?.id || 'anon'}-${code}`
        const body = {
          model: { modelCode: model?.modelCode || code, slug, name: model?.name, basePrice: Number(model?.basePrice||0) },
          selections: [],
          pricing: { base: Number(model?.basePrice||0), options: 0, delivery: 0, total: Number(model?.basePrice||0), deposit: 0 }
        }
        const res2 = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body)
        })
        const json = await res2.json()
        if (json?.orderId) localStorage.setItem('ff.orderId', json.orderId)
      } catch {}
      navigate('/checkout/buyer')
    })()
  }, [isSignedIn, getToken, user, params, navigate])

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
                <SignUp redirectUrl={location.pathname + location.search} signInUrl={location.pathname + location.search} />
              </div>
              <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
                <h2 className="text-lg font-semibold text-gray-100 mb-2">Already have an account?</h2>
                <SignIn redirectUrl={location.pathname + location.search} signUpUrl={location.pathname + location.search} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


