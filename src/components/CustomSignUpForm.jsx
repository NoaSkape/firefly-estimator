import React, { useState } from 'react'
import { useSignUp } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export default function CustomSignUpForm({ redirectUrl }) {
  const { isLoaded, signUp, setActive } = useSignUp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    emailAddress: '',
    password: '',
    firstName: '',
    lastName: '',
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryZipCode: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!isLoaded) return

    try {
      // Create the user account with Clerk
      const result = await signUp.create({
        emailAddress: formData.emailAddress,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      if (result.status === 'complete') {
        // Set the user as active
        await setActive({ session: result.createdSessionId })
        
        // Save delivery address to user metadata
        await result.createdUserId && signUp.update({
          unsafeMetadata: {
            deliveryAddress: formData.deliveryAddress,
            deliveryCity: formData.deliveryCity,
            deliveryState: formData.deliveryState,
            deliveryZipCode: formData.deliveryZipCode
          }
        })

        // Redirect to the intended page
        navigate(redirectUrl)
      } else {
        // Handle verification if needed
        console.log('Sign up result:', result)
      }
    } catch (err) {
      console.error('Sign up error:', err)
      setError(err.errors?.[0]?.message || 'An error occurred during sign up')
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
      
      {/* Personal Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>
      </div>

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
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
      </div>

      {/* Delivery Address */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Address</h3>
        <p className="text-sm text-gray-600 mb-4">
          We need your delivery address to calculate shipping costs and provide accurate pricing.
        </p>
        
        <div>
          <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <input
            type="text"
            id="deliveryAddress"
            name="deliveryAddress"
            value={formData.deliveryAddress}
            onChange={handleInputChange}
            required
            placeholder="123 Main St"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              id="deliveryCity"
              name="deliveryCity"
              value={formData.deliveryCity}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="deliveryState" className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <select
              id="deliveryState"
              name="deliveryState"
              value={formData.deliveryState}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="">Select State</option>
              <option value="TX">Texas</option>
              <option value="OK">Oklahoma</option>
              <option value="AR">Arkansas</option>
              <option value="LA">Louisiana</option>
              <option value="NM">New Mexico</option>
              {/* Add more states as needed */}
            </select>
          </div>
          <div>
            <label htmlFor="deliveryZipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              id="deliveryZipCode"
              name="deliveryZipCode"
              value={formData.deliveryZipCode}
              onChange={handleInputChange}
              required
              pattern="[0-9]{5}"
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isLoaded}
        className="w-full btn-primary text-lg py-4 disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  )
}
