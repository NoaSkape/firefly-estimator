const ClientInfoForm = ({ value, onChange }) => {
  const handleFieldChange = (field, newValue) => {
    onChange({
      ...value,
      [field]: newValue
    })
  }

  const handleZipCodeChange = (e) => {
    const zipCode = e.target.value
    handleFieldChange('zip', zipCode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={value.fullName || ''}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            className="input-field"
            placeholder="Enter full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            value={value.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className="input-field"
            placeholder="(830) 241-2410"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          value={value.email || ''}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          className="input-field"
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Address *
        </label>
        <textarea
          value={value.address || ''}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          className="input-field"
          rows="3"
          placeholder="Enter complete delivery address including street, city, state, and ZIP code"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            value={value.zip || ''}
            onChange={handleZipCodeChange}
            className="input-field"
            placeholder="12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Delivery Date
          </label>
          <input
            type="date"
            value={value.preferredDate || ''}
            onChange={(e) => handleFieldChange('preferredDate', e.target.value)}
            className="input-field"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Instructions
        </label>
        <textarea
          value={value.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          className="input-field"
          rows="2"
          placeholder="Any special delivery requirements or site preparation notes..."
        />
      </div>

      <div className="rounded-lg p-4 border border-yellow-300 bg-yellow-50 text-yellow-900 dark:text-yellow-900">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              Delivery Information
            </h3>
            <div className="mt-2 text-sm">
              <p>• Delivery fee will be calculated based on your ZIP code</p>
              <p>• We'll contact you to schedule delivery once your home is ready</p>
              <p>• Site preparation may be required before delivery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientInfoForm 