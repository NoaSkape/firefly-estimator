import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react'

export default function AuthStep() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  useEffect(() => { if (isSignedIn) navigate('/checkout/payment') }, [isSignedIn, navigate])
  return (
    <div className="max-w-md mx-auto card">
      <h2 className="section-header">Sign in to continue</h2>
      <SignedIn>
        <div className="text-center text-gray-600 dark:text-gray-300">You are signed in. Redirecting…</div>
      </SignedIn>
      <SignedOut>
        <SignIn redirectUrl="/checkout/payment" appearance={{ elements: { card: 'bg-white dark:bg-gray-900' } }} />
      </SignedOut>
    </div>
  )
}


