// Utility for managing anonymous customization storage and migration
import { v4 as uuidv4 } from 'uuid'

const ANONYMOUS_SESSION_KEY = 'ff.anonymous.session'
const ANONYMOUS_CUSTOMIZATION_PREFIX = 'ff.customization.'
const ANONYMOUS_SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

// Generate or retrieve anonymous session ID
export function getAnonymousSessionId() {
  let sessionId = localStorage.getItem(ANONYMOUS_SESSION_KEY)
  
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem(ANONYMOUS_SESSION_KEY, sessionId)
  }
  
  return sessionId
}

// Get customization storage key for a specific model
function getCustomizationKey(modelId, sessionId) {
  return `${ANONYMOUS_CUSTOMIZATION_PREFIX}${modelId}.${sessionId}`
}

// Save customization progress for anonymous user
export function saveAnonymousCustomization(modelId, customization) {
  try {
    const sessionId = getAnonymousSessionId()
    const key = getCustomizationKey(modelId, sessionId)
    const data = {
      ...customization,
      sessionId,
      modelId,
      timestamp: Date.now(),
      expiresAt: Date.now() + ANONYMOUS_SESSION_EXPIRY
    }
    
    localStorage.setItem(key, JSON.stringify(data))
    console.log('Saved anonymous customization:', { modelId, sessionId, key })
    return true
  } catch (error) {
    console.error('Failed to save anonymous customization:', error)
    return false
  }
}

// Load customization progress for anonymous user
export function loadAnonymousCustomization(modelId) {
  try {
    const sessionId = getAnonymousSessionId()
    const key = getCustomizationKey(modelId, sessionId)
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      console.log('No stored customization found for:', { modelId, sessionId })
      return null
    }
    
    const data = JSON.parse(stored)
    
    // Check if data has expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      console.log('Stored customization expired, removing:', { modelId, sessionId })
      localStorage.removeItem(key)
      return null
    }
    
    console.log('Loaded anonymous customization:', { modelId, sessionId, data })
    return {
      selectedOptions: data.selectedOptions || [],
      selectedPackage: data.selectedPackage || '',
      timestamp: data.timestamp
    }
  } catch (error) {
    console.error('Failed to load anonymous customization:', error)
    return null
  }
}

// Clear customization for a specific model
export function clearAnonymousCustomization(modelId) {
  try {
    const sessionId = getAnonymousSessionId()
    const key = getCustomizationKey(modelId, sessionId)
    localStorage.removeItem(key)
    console.log('Cleared anonymous customization:', { modelId, sessionId })
    return true
  } catch (error) {
    console.error('Failed to clear anonymous customization:', error)
    return false
  }
}

// Get all anonymous customizations for migration
export function getAllAnonymousCustomizations() {
  try {
    const sessionId = getAnonymousSessionId()
    const customizations = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(ANONYMOUS_CUSTOMIZATION_PREFIX) && key.includes(sessionId)) {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          if (data && data.expiresAt && Date.now() <= data.expiresAt) {
            customizations.push({
              key,
              modelId: data.modelId,
              customization: {
                selectedOptions: data.selectedOptions || [],
                selectedPackage: data.selectedPackage || ''
              },
              timestamp: data.timestamp
            })
          }
        } catch (parseError) {
          console.error('Failed to parse stored customization:', parseError)
        }
      }
    }
    
    return customizations.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Failed to get anonymous customizations:', error)
    return []
  }
}

// Migrate anonymous customizations to user account
export async function migrateAnonymousCustomizations(userId, token) {
  try {
    const customizations = getAllAnonymousCustomizations()
    
    if (customizations.length === 0) {
      console.log('No anonymous customizations to migrate')
      return []
    }
    
    console.log('Migrating anonymous customizations:', customizations.length, customizations)
    
    const migrated = []
    
    for (const { modelId, customization } of customizations) {
      try {
        console.log('Attempting to migrate customization for model:', modelId, customization)
        
        // Create build for this customization
        const response = await fetch('/api/builds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Idempotency-Key': `migrate-${modelId}-${Date.now()}`
          },
          body: JSON.stringify({
            modelSlug: modelId,
            modelName: modelId, // Will be updated with actual model name
            basePrice: 0, // Will be updated with actual base price
            selections: {
              options: customization.selectedOptions || [],
              package: customization.selectedPackage || ''
            },
            financing: {},
            buyerInfo: {}
          })
        })
        
        console.log('Migration response status:', response.status)
        
        if (response.ok) {
          const result = await response.json()
          console.log('Migration response data:', result)
          migrated.push({
            modelId,
            buildId: result.buildId,
            customization
          })
          console.log('Successfully migrated customization:', { modelId, buildId: result.buildId })
          
          // Store the migrated customization temporarily for immediate restoration
          try {
            const tempKey = `migrated_${modelId}_${userId}`
            localStorage.setItem(tempKey, JSON.stringify(customization))
            console.log('Stored migrated customization for immediate restoration:', tempKey)
          } catch (storageError) {
            console.error('Failed to store migrated customization for restoration:', storageError)
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to migrate customization:', { 
            modelId, 
            status: response.status, 
            statusText: response.statusText,
            error: errorText
          })
        }
      } catch (error) {
        console.error('Error migrating customization:', { modelId, error: error.message, stack: error.stack })
      }
    }
    
    // Clear all anonymous customizations after successful migration
    if (migrated.length > 0) {
      customizations.forEach(({ key }) => {
        localStorage.removeItem(key)
      })
      console.log('Cleared all anonymous customizations after migration')
    }
    
    console.log('Migration completed. Migrated:', migrated.length, 'of', customizations.length)
    return migrated
  } catch (error) {
    console.error('Failed to migrate anonymous customizations:', error)
    return []
  }
}

// Clean up expired customizations
export function cleanupExpiredCustomizations() {
  try {
    const sessionId = getAnonymousSessionId()
    const keysToRemove = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(ANONYMOUS_CUSTOMIZATION_PREFIX) && key.includes(sessionId)) {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          if (data && data.expiresAt && Date.now() > data.expiresAt) {
            keysToRemove.push(key)
          }
        } catch (parseError) {
          // If we can't parse it, remove it
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log('Removed expired customization:', key)
    })
    
    return keysToRemove.length
  } catch (error) {
    console.error('Failed to cleanup expired customizations:', error)
    return 0
  }
}
