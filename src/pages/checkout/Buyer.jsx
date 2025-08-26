import { useEffect, useState } from 'react'
import { useUser, useAuth, SignIn } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { trackEvent } from '../../utils/analytics'
import ConfirmLeaveModal from '../../components/ConfirmLeaveModal'
import FunnelProgress from '../../components/FunnelProgress'
import Breadcrumbs from '../../components/Breadcrumbs'
import AddressSelectionModal from '../../components/AddressSelectionModal'
import useUserProfile from '../../hooks/useUserProfile'
import { useBuildData, buildCache } from '../../hooks/useBuildData'
import { navigateToStep, updateBuildStep } from '../../utils/checkoutNavigation'

export default function Buyer() {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { buildId } = useParams()
  const { addToast } = useToast()
  const { getAutoFillData, updateBasicInfo, addAddress, setPrimaryAddress } = useUserProfile()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: ''
  })
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [autoFillLoaded, setAutoFillLoaded] = useState(false)
  
  // Use centralized build data management with force refresh to ensure latest data
  const { 
    build, 
    loading: buildLoading, 
    error: buildError, 
    updateBuild, 
    isLoaded: buildLoaded 
  } = useBuildData(buildId, true) // Force refresh to ensure we have latest data

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('Loading initial data for buyer form:', { isSignedIn, autoFillLoaded, hasUser: !!user })
        
        // Priority 1: Load from user profile if signed in (most reliable)
        if (isSignedIn && !autoFillLoaded) {
          console.log('Attempting to load auto-fill data from profile...')
          const autoFillData = await getAutoFillData()
          console.log('Loaded auto-fill data from profile:', autoFillData)
          
          if (autoFillData && Object.keys(autoFillData).length > 0) {
            setForm(f => ({
              ...f,
              firstName: autoFillData.firstName || user?.firstName || '',
              lastName: autoFillData.lastName || user?.lastName || '',
              email: autoFillData.email || user?.primaryEmailAddress?.emailAddress || '',
              phone: autoFillData.phone || '',
              address: autoFillData.address || '',
              city: autoFillData.city || '',
              state: autoFillData.state || '',
              zip: autoFillData.zip || ''
            }))
            console.log('Form updated with auto-fill data')
          } else {
            console.log('No auto-fill data found, falling back to Clerk user data')
            // Fallback to Clerk user data
            setForm(f => ({
              ...f,
              firstName: f.firstName || user?.firstName || '',
              lastName: f.lastName || user?.lastName || '',
              email: f.email || user?.primaryEmailAddress?.emailAddress || ''
            }))
          }
          setAutoFillLoaded(true)
        } else if (user && !autoFillLoaded) {
          // Priority 2: Fallback to Clerk user data
          console.log('Loading from Clerk user data')
          setForm(f => ({
            ...f,
            firstName: f.firstName || user.firstName || '',
            lastName: f.lastName || user.lastName || '',
            email: f.email || user.primaryEmailAddress?.emailAddress || ''
          }))
          setAutoFillLoaded(true)
        }
        
        // Priority 3: Load from localStorage as fallback (only if no profile data)
        if (!isSignedIn || !autoFillLoaded) {
          const saved = JSON.parse(localStorage.getItem('ff.checkout.buyer') || '{}')
          if (Object.keys(saved).length > 0) {
            console.log('Loading from localStorage:', saved)
            setForm(f => ({ ...f, ...saved }))
          }
        }
      } catch (error) {
        console.error('Error loading auto-fill data:', error)
        // Fallback to Clerk user data on error
        if (user && !autoFillLoaded) {
          setForm(f => ({
            ...f,
            firstName: f.firstName || user.firstName || '',
            lastName: f.lastName || user.lastName || '',
            email: f.email || user.primaryEmailAddress?.emailAddress || ''
          }))
          setAutoFillLoaded(true)
        }
      }
    }
    
    loadInitialData()
  }, [user, isSignedIn, autoFillLoaded, getAutoFillData])

  function setField(k, v) { 
    setForm(f => {
      const updatedForm = { ...f, [k]: v }
      
      // Auto-save to localStorage as user types (for better UX)
      try {
        localStorage.setItem('ff.checkout.buyer', JSON.stringify(updatedForm))
      } catch (error) {
        console.error('Error auto-saving to localStorage:', error)
      }
      
      return updatedForm
    })
    setDirty(true)
  }
  
  const handleAddressSelect = (addressObj, fullAddressString) => {
    const updatedForm = {
      ...form,
      address: addressObj.address,
      city: addressObj.city,
      state: addressObj.state,
      zip: addressObj.zip
    }
    
    setForm(updatedForm)
    setDirty(true)
    setShowAddressModal(false)
    
    // Save to localStorage immediately
    try {
      localStorage.setItem('ff.checkout.buyer', JSON.stringify(updatedForm))
    } catch (error) {
      console.error('Error saving address to localStorage:', error)
    }
  }
  function validate() {
    const e = {}
    if (!form.firstName) e.firstName = 'Required'
    if (!form.lastName) e.lastName = 'Required'
    if (!form.email) e.email = 'Required'
    if (!form.address) e.address = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function next() {
    if (!validate()) { addToast({ type:'error', message:'Please complete required fields' }); return }
    try {
      const token = await getToken()
      setSaving(true)
      
      // Save to user profile for future auto-fill (non-blocking)
      if (isSignedIn) {
        // Use Promise.allSettled to not block checkout if profile save fails
        Promise.allSettled([
          (async () => {
            try {
              console.log('Saving to user profile:', form)
              
              // Update basic info
              const basicInfoResult = await updateBasicInfo({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone
              })
              console.log('Basic info saved:', basicInfoResult)
              
              // Add address to address book and set as primary
              if (form.address && form.city && form.state && form.zip) {
                const addressResult = await addAddress({
                  address: form.address,
                  city: form.city,
                  state: form.state,
                  zip: form.zip,
                  label: 'Home',
                  isPrimary: true // Set as primary address
                })
                console.log('Address saved:', addressResult)
                
                // If the address was added successfully and has an ID, set it as primary
                if (addressResult && addressResult.addresses) {
                  const newAddress = addressResult.addresses.find(addr => 
                    addr.address === form.address && 
                    addr.city === form.city && 
                    addr.state === form.state && 
                    addr.zip === form.zip
                  )
                  if (newAddress && newAddress.id) {
                    await setPrimaryAddress(newAddress.id)
                    console.log('Address set as primary:', newAddress.id)
                  }
                }
              }
            } catch (profileError) {
              console.error('Error saving to profile:', profileError)
              // Don't show error toast - profile save is optional
            }
          })()
        ])
      }
      
      // Save to localStorage for immediate persistence
      try {
        localStorage.setItem('ff.checkout.buyer', JSON.stringify(form))
        console.log('Saved to localStorage:', form)
      } catch (localStorageError) {
        console.error('Error saving to localStorage:', localStorageError)
      }
      
      // Update build with buyer info and advance to step 5 (Overview)
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ buyerInfo: form })
      })
      
      if (!res.ok) { 
        const errorData = await res.json().catch(() => ({}))
        addToast({ type: 'error', message: errorData.error || 'Please complete required fields' }); 
        return 
      }
      
      // Removed "Saved" toast - unnecessary for better UX
      trackEvent('buyer_saved', { buildId })
      
      // Update build step to 5 (Overview)
      await updateBuildStep(buildId, 5, token)
      trackEvent('step_changed', { buildId, step: 5 })
    } catch (error) {
      console.error('Error in next function:', error)
      addToast({ type: 'error', message: 'Failed to save. Please try again.' })
    } finally { 
      setSaving(false); 
      setDirty(false) 
    }
    navigate(`/checkout/${buildId}/review`)
  }

  // Leave guards
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    function onPop(e) {
      e.preventDefault?.()
      setShowLeave(true)
      window.history.pushState({ stay: true }, '')
    }
    window.addEventListener('popstate', onPop)
    window.history.pushState({ stay: true }, '')
    return () => window.removeEventListener('popstate', onPop)
  }, [dirty])

  const handleFunnelNavigation = (stepName, stepIndex) => {
    navigateToStep(stepName, 'Delivery Address', buildId, isSignedIn, build, navigate, addToast, () => {
      // Invalidate cache before navigation to ensure fresh data
      buildCache.delete(buildId)
    })
  }

  // Debug function to test profile system
  const debugProfile = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/profile/debug', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const debugData = await response.json()
      console.log('DEBUG Profile Data:', debugData)
      addToast({
        type: 'info',
        title: 'Debug Data',
        message: `Profile: ${!!debugData.profile}, AutoFill: ${!!debugData.autoFillData}, Primary Address: ${!!debugData.primaryAddress}`
      })
    } catch (error) {
      console.error('Debug error:', error)
      addToast({
        type: 'error',
        title: 'Debug Failed',
        message: error.message
      })
    }
  }

  return (
    <div>
      <FunnelProgress 
        current="Delivery Address" 
        isSignedIn={isSignedIn} 
        onNavigate={handleFunnelNavigation}
        build={build}
        buildId={buildId}
      />
      <div className="max-w-3xl mx-auto">
        {!isSignedIn && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Create Your Account</h2>
            <p className="text-sm text-gray-300 mb-3">Sign in or create an account so your design and checkout progress are saved.</p>
            <SignIn 
              fallbackRedirectUrl={location.pathname + location.search}
              afterSignInUrl={location.pathname + location.search}
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
              onError={(error) => {
                console.error('Buyer SignIn error:', error)
                addToast({
                  type: 'error',
                  title: 'Sign In Error',
                  message: 'Unable to sign in. Please check your credentials and try again.',
                  duration: 6000
                })
              }}
            />
          </div>
        )}
        <h1 className="section-header">Buyer & Delivery Info</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className={`input-field ${errors.firstName?'border-red-600':''}`} placeholder="First name" value={form.firstName} onChange={e=>setField('firstName', e.target.value)} />
          <input className={`input-field ${errors.lastName?'border-red-600':''}`} placeholder="Last name" value={form.lastName} onChange={e=>setField('lastName', e.target.value)} />
          <input className={`input-field md:col-span-2 ${errors.email?'border-red-600':''}`} placeholder="Email" value={form.email} onChange={e=>setField('email', e.target.value)} />
          <input className="input-field md:col-span-2" placeholder="Phone" value={form.phone} onChange={e=>setField('phone', e.target.value)} />
          <div className="md:col-span-2 space-y-2">
            <div className="flex gap-2">
              <input 
                className={`input-field flex-1 ${errors.address?'border-red-600':''}`} 
                placeholder="Address" 
                value={form.address} 
                onChange={e=>setField('address', e.target.value)} 
              />
              {isSignedIn && (
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700 text-sm whitespace-nowrap"
                  title="Select from saved addresses"
                >
                  📍 Saved
                </button>
              )}
            </div>
          </div>
          <input className="input-field" placeholder="City" value={form.city} onChange={e=>setField('city', e.target.value)} />
          <input className="input-field" placeholder="State" value={form.state} onChange={e=>setField('state', e.target.value)} />
          <input className="input-field" placeholder="ZIP" value={form.zip} onChange={e=>setField('zip', e.target.value)} />
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn-primary" onClick={next}>Continue</button>
          {process.env.NODE_ENV === 'development' && (
            <button 
              className="btn-secondary" 
              onClick={async () => {
                try {
                  const token = await getToken()
                  const headers = token ? { Authorization: `Bearer ${token}` } : {}
                  const response = await fetch('/api/profile/debug', { headers })
                  const data = await response.json()
                  console.log('Profile Debug Data:', data)
                  addToast({ type: 'info', message: 'Check console for debug data' })
                } catch (error) {
                  console.error('Debug error:', error)
                }
              }}
            >
              Debug Profile
            </button>
          )}
        </div>
        <ConfirmLeaveModal
          open={showLeave}
          saving={saving}
          onSaveLeave={async ()=>{ await next(); setShowLeave(false) }}
          onDiscard={()=>{ setDirty(false); setShowLeave(false); window.history.back() }}
          onStay={()=>setShowLeave(false)}
        />
        
        <AddressSelectionModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          onSelectAddress={handleAddressSelect}
          currentAddress={form}
        />
      </div>
    </div>
  )
}


