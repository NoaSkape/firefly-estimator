/**
 * Address Selection Modal
 * Allows users to select from saved addresses or add a new one
 */

import { useState, useEffect } from 'react'
import useUserProfile from '../hooks/useUserProfile'

export default function AddressSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectAddress, 
  currentAddress = null 
}) {
  const { addresses, addAddress, setPrimaryAddress, removeAddress, loading } = useUserProfile()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    label: 'Home'
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false)
      setNewAddress({
        address: '',
        city: '',
        state: '',
        zip: '',
        label: 'Home'
      })
    }
  }, [isOpen])

  const handleSelectAddress = async (address) => {
    try {
      // Set as primary if not already
      if (!address.isPrimary) {
        await setPrimaryAddress(address.id)
      }
      
      // Return the full address string
      const fullAddress = [address.address, address.city, address.state, address.zip]
        .filter(Boolean)
        .join(', ')
      
      onSelectAddress(address, fullAddress)
      onClose()
    } catch (error) {
      console.error('Error selecting address:', error)
    }
  }

  const handleAddNewAddress = async (e) => {
    e.preventDefault()
    
    try {
      const addedProfile = await addAddress(newAddress)
      
      // Find the newly added address and select it
      const newAddr = addedProfile.addresses[addedProfile.addresses.length - 1]
      if (newAddr) {
        handleSelectAddress(newAddr)
      }
    } catch (error) {
      console.error('Error adding address:', error)
    }
  }

  const handleRemoveAddress = async (addressId, e) => {
    e.stopPropagation()
    
    if (addresses.length <= 1) {
      alert('You must have at least one address saved.')
      return
    }
    
    if (confirm('Are you sure you want to remove this address?')) {
      try {
        await removeAddress(addressId)
      } catch (error) {
        console.error('Error removing address:', error)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Select Delivery Address</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {!showAddForm ? (
          <>
            {/* Saved Addresses */}
            <div className="space-y-3 mb-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    address.isPrimary 
                      ? 'border-yellow-400 bg-yellow-400/10' 
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{address.label}</span>
                        {address.isPrimary && (
                          <span className="px-2 py-1 bg-yellow-400 text-black text-xs rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-gray-300 text-sm mt-1">
                        {address.address}<br />
                        {address.city}, {address.state} {address.zip}
                      </div>
                    </div>
                    {addresses.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveAddress(address.id, e)}
                        className="text-red-400 hover:text-red-300 ml-2"
                        title="Remove address"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Address Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full btn-secondary"
            >
              + Add New Address
            </button>
          </>
        ) : (
          <>
            {/* Add New Address Form */}
            <form onSubmit={handleAddNewAddress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  placeholder="Home, Work, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                    placeholder="TX"
                    maxLength="2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.zip}
                  onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  placeholder="12345"
                  maxLength="10"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? 'Adding...' : 'Add & Select'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
