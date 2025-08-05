const ClientInfoForm = ({ register, errors, onDeliveryCalculation }) => {
  const handleZipCodeChange = (e) => {
    const zipCode = e.target.value
    if (zipCode.length === 5) {
      onDeliveryCalculation(zipCode)
    }
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
            {...register('name', { required: 'Name is required' })}
            className="input-field"
            placeholder="Enter full name"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            {...register('phone', { 
              required: 'Phone number is required',
              pattern: {
                value: /^[\+]?[1-9][\d]{0,15}$/,
                message: 'Please enter a valid phone number'
              }
            })}
            className="input-field"
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address'
            }
          })}
          className="input-field"
          placeholder="your.email@example.com"
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Address *
        </label>
        <textarea
          {...register('address', { required: 'Delivery address is required' })}
          className="input-field"
          rows="3"
          placeholder="Enter complete delivery address including street, city, state, and ZIP code"
        />
        {errors.address && (
          <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            {...register('zipCode', { 
              required: 'ZIP code is required',
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Please enter a valid ZIP code'
              }
            })}
            className="input-field"
            placeholder="12345"
            onChange={handleZipCodeChange}
          />
          {errors.zipCode && (
            <p className="text-red-600 text-sm mt-1">{errors.zipCode.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Delivery Date
          </label>
          <input
            type="date"
            {...register('deliveryDate')}
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
          {...register('specialInstructions')}
          className="input-field"
          rows="2"
          placeholder="Any special delivery requirements or site preparation notes..."
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Delivery Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
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