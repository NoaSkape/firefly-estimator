import { useEffect, useState } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'
import { migrateAnonymousCustomizations } from '../utils/customizationStorage'

const CustomizationMigration = () => {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const [migrating, setMigrating] = useState(false)
  const [migrated, setMigrated] = useState(false)

  useEffect(() => {
    const handleMigration = async () => {
      // Only migrate if user is signed in and we haven't migrated yet
      if (isSignedIn && user && !migrated && !migrating) {
        setMigrating(true)
        
        try {
          const token = await getToken()
          const migratedCustomizations = await migrateAnonymousCustomizations(user.id, token)
          
          if (migratedCustomizations.length > 0) {
            addToast({
              type: 'success',
              title: 'Customizations Restored!',
              message: `Successfully restored ${migratedCustomizations.length} customization${migratedCustomizations.length > 1 ? 's' : ''} to your account.`
            })
            
            // If we're on a customization page, redirect to the first migrated build
            if (window.location.pathname.includes('/customize/')) {
              const firstBuild = migratedCustomizations[0]
              if (firstBuild?.buildId) {
                // Redirect to the build customization page
                window.location.href = `/builds/${firstBuild.buildId}`
                return
              }
            }
          }
          
          setMigrated(true)
        } catch (error) {
          console.error('Failed to migrate customizations:', error)
          addToast({
            type: 'error',
            title: 'Migration Failed',
            message: 'Failed to restore your customizations. You can still access them from your account.'
          })
          setMigrated(true)
        } finally {
          setMigrating(false)
        }
      }
    }

    handleMigration()
  }, [isSignedIn, user, migrated, migrating, getToken, addToast])

  // Don't render anything - this is a background component
  return null
}

export default CustomizationMigration
