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
      if (!model) { navigate('/models'); return }
      // read guest draft and create a Build
      let guest = null
      try { guest = JSON.parse(localStorage.getItem(`ff_guest_build_${slug}`) || 'null') } catch {}
      try {
        const token = await getToken()
        const body = {
          modelSlug: slug,
          modelName: model?.name,
          basePrice: Number(model?.basePrice || 0),
          selections: guest?.selections || { options: [] },
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


