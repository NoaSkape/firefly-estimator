import React from 'react'

export default function LoadingSpinner({ size = 'md', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-yellow-500`} />
      {message && (
        <div className="mt-4 text-gray-400 text-sm">{message}</div>
      )}
    </div>
  )
}

// Page loading component specifically for lazy-loaded pages
export function PageLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
        <div className="w-12 h-12 animate-spin rounded-full border-3 border-gray-300 border-t-yellow-500 mx-auto mb-4" />
        <div className="text-white text-lg">Loading page...</div>
        <div className="text-gray-300 text-sm mt-2">Please wait while we prepare your content</div>
      </div>
    </div>
  )
}
