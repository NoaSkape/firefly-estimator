/**
 * User Profile Management
 * Handles user profiles, addresses, and auto-fill data
 */

import { getDb } from './db.js'

const USER_PROFILES_COLLECTION = 'UserProfiles'

/**
 * Ensure indexes for user profiles collection
 */
export async function ensureUserProfileIndexes() {
  const db = await getDb()
  const collection = db.collection(USER_PROFILES_COLLECTION)
  
  // Index on userId for quick lookups
  await collection.createIndex({ userId: 1 }, { unique: true })
  
  // Index on updatedAt for sorting
  await collection.createIndex({ updatedAt: 1 })
}

/**
 * Get user profile by userId
 * @param {string} userId - Clerk user ID
 * @returns {object|null} User profile or null if not found
 */
export async function getUserProfile(userId) {
  if (!userId) return null
  
  const db = await getDb()
  const collection = db.collection(USER_PROFILES_COLLECTION)
  
  return await collection.findOne({ userId })
}

/**
 * Create or update user profile
 * @param {string} userId - Clerk user ID
 * @param {object} profileData - Profile data to save
 * @returns {object} Updated profile
 */
export async function updateUserProfile(userId, profileData) {
  if (!userId) throw new Error('userId is required')
  
  const db = await getDb()
  const collection = db.collection(USER_PROFILES_COLLECTION)
  
  const now = new Date()
  
  // Remove createdAt from profileData to avoid conflicts with $setOnInsert
  const { createdAt, ...profileDataWithoutCreatedAt } = profileData
  
  const updateData = {
    ...profileDataWithoutCreatedAt,
    userId,
    updatedAt: now
  }
  
  // Use upsert to create if doesn't exist
  const result = await collection.findOneAndUpdate(
    { userId },
    { 
      $set: updateData,
      $setOnInsert: { createdAt: now }
    },
    { 
      upsert: true, 
      returnDocument: 'after' 
    }
  )
  
  return result.value
}

/**
 * Add an address to user's address book
 * @param {string} userId - Clerk user ID
 * @param {object} address - Address object
 * @returns {object} Updated profile
 */
export async function addUserAddress(userId, address) {
  if (!userId || !address) throw new Error('userId and address are required')
  
  const profile = await getUserProfile(userId) || { addresses: [] }
  const addresses = Array.isArray(profile.addresses) ? profile.addresses : []
  
  // Create address object with metadata
  const addressWithMeta = {
    id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...address,
    addedAt: new Date(),
    isPrimary: address.isPrimary !== undefined ? address.isPrimary : (addresses.length === 0), // Respect isPrimary parameter
    label: address.label || 'Home'
  }
  
  // Check if address already exists (by comparing key fields)
  const existingIndex = addresses.findIndex(addr => 
    addr.address === address.address &&
    addr.city === address.city &&
    addr.state === address.state &&
    addr.zip === address.zip
  )
  
  if (existingIndex >= 0) {
    // Update existing address
    addresses[existingIndex] = { ...addresses[existingIndex], ...addressWithMeta, id: addresses[existingIndex].id }
  } else {
    // Add new address
    addresses.push(addressWithMeta)
  }
  
  // If this address is being set as primary, make all other addresses non-primary
  if (addressWithMeta.isPrimary) {
    addresses.forEach((addr, index) => {
      if (index !== addresses.length - 1) { // Not the newly added/updated address
        addr.isPrimary = false
      }
    })
  }
  
  return await updateUserProfile(userId, { 
    ...profile,
    addresses 
  })
}

/**
 * Set primary address for user
 * @param {string} userId - Clerk user ID
 * @param {string} addressId - Address ID to make primary
 * @returns {object} Updated profile
 */
export async function setPrimaryAddress(userId, addressId) {
  if (!userId || !addressId) throw new Error('userId and addressId are required')
  
  const profile = await getUserProfile(userId)
  if (!profile || !Array.isArray(profile.addresses)) {
    throw new Error('User profile or addresses not found')
  }
  
  // Update all addresses to set isPrimary
  const updatedAddresses = profile.addresses.map(addr => ({
    ...addr,
    isPrimary: addr.id === addressId
  }))
  
  return await updateUserProfile(userId, {
    ...profile,
    addresses: updatedAddresses
  })
}

/**
 * Get user's primary address
 * @param {string} userId - Clerk user ID
 * @returns {object|null} Primary address or null
 */
export async function getPrimaryAddress(userId) {
  const profile = await getUserProfile(userId)
  if (!profile || !Array.isArray(profile.addresses)) return null
  
  return profile.addresses.find(addr => addr.isPrimary) || profile.addresses[0] || null
}

/**
 * Remove address from user's address book
 * @param {string} userId - Clerk user ID
 * @param {string} addressId - Address ID to remove
 * @returns {object} Updated profile
 */
export async function removeUserAddress(userId, addressId) {
  if (!userId || !addressId) throw new Error('userId and addressId are required')
  
  const profile = await getUserProfile(userId)
  if (!profile || !Array.isArray(profile.addresses)) {
    throw new Error('User profile or addresses not found')
  }
  
  const addresses = profile.addresses.filter(addr => addr.id !== addressId)
  
  // If we removed the primary address, make the first remaining address primary
  if (addresses.length > 0 && !addresses.some(addr => addr.isPrimary)) {
    addresses[0].isPrimary = true
  }
  
  return await updateUserProfile(userId, {
    ...profile,
    addresses
  })
}

/**
 * Update user's basic info (name, email, phone)
 * @param {string} userId - Clerk user ID
 * @param {object} basicInfo - Basic info object
 * @returns {object} Updated profile
 */
export async function updateUserBasicInfo(userId, basicInfo) {
  if (!userId) throw new Error('userId is required')
  
  const profile = await getUserProfile(userId) || {}
  
  const updatedProfile = await updateUserProfile(userId, {
    ...profile,
    firstName: basicInfo.firstName || profile.firstName,
    lastName: basicInfo.lastName || profile.lastName,
    email: basicInfo.email || profile.email,
    phone: basicInfo.phone || profile.phone
  })
  
  return updatedProfile
}

/**
 * Get auto-fill data for forms
 * @param {string} userId - Clerk user ID
 * @returns {object} Auto-fill data
 */
export async function getAutoFillData(userId) {
  const profile = await getUserProfile(userId)
  if (!profile) return {}
  
  const primaryAddress = await getPrimaryAddress(userId)
  
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address: primaryAddress?.address || '',
    city: primaryAddress?.city || '',
    state: primaryAddress?.state || '',
    zip: primaryAddress?.zip || '',
    deliveryAddress: primaryAddress ? 
      [primaryAddress.address, primaryAddress.city, primaryAddress.state, primaryAddress.zip]
        .filter(Boolean)
        .join(', ') : ''
  }
}
