/**
 * User Profile Management Hook
 * Provides functionality for managing user profiles, addresses, and auto-fill data
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!isSignedIn) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch('/api/profile', { headers })
      
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const profileData = await response.json()
      setProfile(profileData)
      setAddresses(profileData.addresses || [])
      
    } catch (err) {
      setError(err.message)
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    if (!isSignedIn) return
    
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch('/api/profile/addresses', { headers })
      if (!response.ok) throw new Error('Failed to fetch addresses')
      
      const addressData = await response.json()
      setAddresses(addressData)
      
    } catch (err) {
      setError(err.message)
      console.error('Error fetching addresses:', err)
    }
  }, [isSignedIn, getToken])

  // Update basic info
  const updateBasicInfo = useCallback(async (basicInfo) => {
    if (!isSignedIn) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
      
      const response = await fetch('/api/profile/basic', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(basicInfo)
      })
      
      console.log('Profile update response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Profile update failed:', response.status, errorText)
        throw new Error(`Failed to update basic info: ${response.status} ${errorText}`)
      }
      
      const responseText = await response.text()
      console.log('Profile update response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from server, but request was successful')
        // Refresh profile data instead of throwing error
        await fetchProfile()
        return profile
      }
      
      try {
        const updatedProfile = JSON.parse(responseText)
        setProfile(updatedProfile)
        return updatedProfile
      } catch (parseError) {
        console.warn('Failed to parse response JSON, refreshing profile instead:', parseError)
        await fetchProfile()
        return profile
      }
    } catch (err) {
      setError(err.message)
      console.error('Error updating basic info:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  // Add new address
  const addAddress = useCallback(async (address) => {
    if (!isSignedIn) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
      
      const response = await fetch('/api/profile/addresses', {
        method: 'POST',
        headers,
        body: JSON.stringify(address)
      })
      
      if (!response.ok) throw new Error('Failed to add address')
      
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from server when adding address, refreshing profile instead')
        await fetchProfile()
        return profile
      }
      
      try {
        const updatedProfile = JSON.parse(responseText)
        setProfile(updatedProfile)
        setAddresses(updatedProfile.addresses || [])
        return updatedProfile
      } catch (parseError) {
        console.warn('Failed to parse address response JSON, refreshing profile instead:', parseError)
        await fetchProfile()
        return profile
      }
    } catch (err) {
      setError(err.message)
      console.error('Error adding address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  // Set primary address
  const setPrimaryAddress = useCallback(async (addressId) => {
    if (!isSignedIn) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
      
      const response = await fetch(`/api/profile/addresses/${addressId}/primary`, {
        method: 'PATCH',
        headers
      })
      
      if (!response.ok) throw new Error('Failed to set primary address')
      
      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setAddresses(updatedProfile.addresses || [])
      
      return updatedProfile
    } catch (err) {
      setError(err.message)
      console.error('Error setting primary address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  // Remove address
  const removeAddress = useCallback(async (addressId) => {
    if (!isSignedIn) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch(`/api/profile/addresses/${addressId}`, {
        method: 'DELETE',
        headers
      })
      
      if (!response.ok) throw new Error('Failed to remove address')
      
      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setAddresses(updatedProfile.addresses || [])
      
      return updatedProfile
    } catch (err) {
      setError(err.message)
      console.error('Error removing address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  // Get auto-fill data
  const getAutoFillData = useCallback(async () => {
    if (!isSignedIn) return {}
    
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch('/api/profile/autofill', { headers })
      if (!response.ok) throw new Error('Failed to fetch auto-fill data')
      
      return await response.json()
    } catch (err) {
      console.error('Error fetching auto-fill data:', err)
      return {}
    }
  }, [isSignedIn, getToken])

  // Get primary address
  const getPrimaryAddress = useCallback(() => {
    return addresses.find(addr => addr.isPrimary) || addresses[0] || null
  }, [addresses])

  // Load profile on sign in
  useEffect(() => {
    if (isSignedIn) {
      fetchProfile()
    } else {
      setProfile(null)
      setAddresses([])
      setError(null)
    }
  }, [isSignedIn, fetchProfile])

  return {
    profile,
    addresses,
    loading,
    error,
    fetchProfile,
    fetchAddresses,
    updateBasicInfo,
    addAddress,
    setPrimaryAddress,
    removeAddress,
    getAutoFillData,
    getPrimaryAddress
  }
}

export default useUserProfile
