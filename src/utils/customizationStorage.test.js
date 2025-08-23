// Simple test for customization storage utility
// This can be run in the browser console to test functionality

import { 
  saveAnonymousCustomization, 
  loadAnonymousCustomization, 
  clearAnonymousCustomization,
  getAllAnonymousCustomizations,
  cleanupExpiredCustomizations
} from './customizationStorage.js'

// Mock localStorage for testing
const mockLocalStorage = {}
global.localStorage = {
  getItem: (key) => mockLocalStorage[key] || null,
  setItem: (key, value) => { mockLocalStorage[key] = value },
  removeItem: (key) => { delete mockLocalStorage[key] },
  length: Object.keys(mockLocalStorage).length,
  key: (index) => Object.keys(mockLocalStorage)[index]
}

// Test data
const testModelId = 'test-model-123'
const testCustomization = {
  selectedOptions: [
    { id: 'option-1', name: 'Test Option 1', price: 100 },
    { id: 'option-2', name: 'Test Option 2', price: 200 }
  ],
  selectedPackage: 'test-package'
}

// Test functions
export function testCustomizationStorage() {
  console.log('🧪 Testing Customization Storage Utility...')
  
  // Test 1: Save customization
  console.log('Test 1: Saving customization...')
  const saveResult = saveAnonymousCustomization(testModelId, testCustomization)
  console.log('Save result:', saveResult)
  
  // Test 2: Load customization
  console.log('Test 2: Loading customization...')
  const loadedCustomization = loadAnonymousCustomization(testModelId)
  console.log('Loaded customization:', loadedCustomization)
  
  // Test 3: Verify data integrity
  console.log('Test 3: Verifying data integrity...')
  const isDataIntact = loadedCustomization && 
    loadedCustomization.selectedOptions.length === testCustomization.selectedOptions.length &&
    loadedCustomization.selectedPackage === testCustomization.selectedPackage
  console.log('Data integrity check:', isDataIntact)
  
  // Test 4: Get all customizations
  console.log('Test 4: Getting all customizations...')
  const allCustomizations = getAllAnonymousCustomizations()
  console.log('All customizations:', allCustomizations)
  
  // Test 5: Clear customization
  console.log('Test 5: Clearing customization...')
  const clearResult = clearAnonymousCustomization(testModelId)
  console.log('Clear result:', clearResult)
  
  // Test 6: Verify cleared
  console.log('Test 6: Verifying cleared...')
  const clearedCustomization = loadAnonymousCustomization(testModelId)
  console.log('After clear:', clearedCustomization)
  
  // Test 7: Cleanup expired
  console.log('Test 7: Testing cleanup...')
  const cleanupResult = cleanupExpiredCustomizations()
  console.log('Cleanup result:', cleanupResult)
  
  console.log('✅ Customization Storage Tests Complete!')
  
  return {
    saveResult,
    loadedCustomization,
    isDataIntact,
    allCustomizations,
    clearResult,
    clearedCustomization,
    cleanupResult
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testCustomizationStorage = testCustomizationStorage
}
