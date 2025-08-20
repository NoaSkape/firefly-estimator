import React, { useState } from 'react'
import { useSignIn } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export default function CustomSignInForm({ redirectUrl }) {
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    emailAddress: '',
    password: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!isLoaded) return

    // Validate form
    if (!formData.emailAddress || !formData.password) {
      setError('Please enter both your email address and password.')
      setLoading(false)
      return
    }

    try {
      // Attempt to sign in
      const result = await signIn.create({
        identifier: formData.emailAddress,
        password: formData.password,
      })

      if (result.status === 'complete') {
        // Set the user as active
        await setActive({ session: result.createdSessionId })
        
        // Redirect to the intended page
        navigate(redirectUrl)
      } else {
        // Handle verification if needed
        console.log('Sign in result:', result)
        setError('Please check your email for verification instructions.')
      }
    } catch (err) {
      console.error('Sign in error:', err)
      
      // Handle specific error cases
      if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        setError('No account found with this email address. Please check your email or create a new account.')
      } else if (err.errors?.[0]?.code === 'form_password_incorrect') {
        setError('Incorrect password. Please try again.')
      } else if (err.errors?.[0]?.code === 'form_identifier_exists') {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(err.errors?.[0]?.message || 'An error occurred during sign in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="emailAddress"
          name="emailAddress"
          value={formData.emailAddress}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="Enter your email address"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password *
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !isLoaded}
        className="w-full btn-primary text-lg py-4 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  )
}
