import React, { useState, useEffect } from 'react'

const InstallAppButton = ({ className = '', variant = 'default' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }
      
      // Check if running as PWA
      if (window.navigator.standalone === true) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    // Check initial state
    checkIfInstalled()

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support beforeinstallprompt
      if (navigator.userAgent.includes('Chrome')) {
        // Show instructions for manual installation
        alert('To install the Firefly app:\n\n1. Click the menu (⋮) in your browser\n2. Select "Install Firefly Tiny Homes"\n3. Click "Install"')
      } else {
        alert('To install the Firefly app, look for the install option in your browser menu.')
      }
      return
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setIsInstalled(true)
        setIsInstallable(false)
      } else {
        console.log('User dismissed the install prompt')
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  // Don't show if already installed
  if (isInstalled) {
    return null
  }

  // Don't show if not installable and no fallback
  if (!isInstallable && !navigator.userAgent.includes('Chrome')) {
    return null
  }

  const buttonText = isInstallable ? 'Install Firefly App' : 'Install Firefly App'
  const buttonIcon = '📱'

  if (variant === 'mobile') {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center w-full px-4 py-3 text-left text-gray-900 font-semibold hover:bg-gray-100 transition-colors duration-200 ${className}`}
      >
        <span className="mr-3 text-lg">{buttonIcon}</span>
        {buttonText}
      </button>
    )
  }

  return (
    <button
      onClick={handleInstallClick}
      className={`flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 ${className}`}
    >
      <span className="mr-2">{buttonIcon}</span>
      {buttonText}
    </button>
  )
}

export default InstallAppButton
