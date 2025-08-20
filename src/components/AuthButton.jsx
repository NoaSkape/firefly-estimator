import React from 'react'
import { useUser } from '@clerk/clerk-react'
import { UserButton } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function AuthButton() {
  const { isSignedIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignIn = () => {
    navigate(`/sign-in?redirect=${encodeURIComponent(location.pathname)}`)
  }

  const handleSignUp = () => {
    navigate(`/sign-up?redirect=${encodeURIComponent(location.pathname)}`)
  }

  if (isSignedIn) {
    // Show Clerk's UserButton for signed-in users
    return (
      <div className="bg-white rounded-full p-1 shadow-lg">
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: 'w-8 h-8',
              userButtonTrigger: 'focus:shadow-none hover:opacity-80'
            }
          }}
        />
      </div>
    )
  }

  // Show custom sign-in/sign-up buttons for public users
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleSignIn}
        className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white rounded-md hover:bg-white hover:text-gray-900 transition-colors"
      >
        Sign In
      </button>
      <button
        onClick={handleSignUp}
        className="px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-400 border border-yellow-400 rounded-md hover:bg-yellow-500 hover:border-yellow-500 transition-colors"
      >
        Sign Up
      </button>
    </div>
  )
}
