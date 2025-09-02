// Admin Authentication and Authorization System
// Handles role-based access control, permissions, and security for the admin panel

import { clerkClient } from '@clerk/backend'
import { z } from 'zod'

// Role definitions and permissions
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer'
}

// Permission definitions
export const PERMISSIONS = {
  // Model Management
  MODELS_VIEW: 'models:view',
  MODELS_CREATE: 'models:create',
  MODELS_EDIT: 'models:edit',
  MODELS_DELETE: 'models:delete',
  MODELS_PUBLISH: 'models:publish',

  // Order Management
  ORDERS_VIEW: 'orders:view',
  ORDERS_CREATE: 'orders:create',
  ORDERS_EDIT: 'orders:edit',
  ORDERS_CANCEL: 'orders:cancel',
  ORDERS_REFUND: 'orders:refund',

  // Customer Management
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_EDIT: 'customers:edit',
  CUSTOMERS_DELETE: 'customers:delete',

  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',

  // Financial Management
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_EDIT: 'financial:edit',
  FINANCIAL_REPORTS: 'financial:reports',

  // System Administration
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SYSTEM_LOGS: 'system:logs',
  BACKUP_RESTORE: 'backup:restore'
}

// Role permission mappings
export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  [ADMIN_ROLES.ADMIN]: [
    PERMISSIONS.MODELS_VIEW, PERMISSIONS.MODELS_CREATE, PERMISSIONS.MODELS_EDIT, PERMISSIONS.MODELS_DELETE, PERMISSIONS.MODELS_PUBLISH,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_EDIT, PERMISSIONS.ORDERS_CANCEL, PERMISSIONS.ORDERS_REFUND,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT,
    PERMISSIONS.FINANCIAL_VIEW, PERMISSIONS.FINANCIAL_EDIT, PERMISSIONS.FINANCIAL_REPORTS,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SYSTEM_LOGS
  ],
  [ADMIN_ROLES.MANAGER]: [
    PERMISSIONS.MODELS_VIEW, PERMISSIONS.MODELS_CREATE, PERMISSIONS.MODELS_EDIT,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.FINANCIAL_VIEW, PERMISSIONS.FINANCIAL_REPORTS,
    PERMISSIONS.SETTINGS_VIEW
  ],
  [ADMIN_ROLES.STAFF]: [
    PERMISSIONS.MODELS_VIEW,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.FINANCIAL_VIEW
  ],
  [ADMIN_ROLES.VIEWER]: [
    PERMISSIONS.MODELS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.FINANCIAL_VIEW
  ]
}

// Permission validation schemas
export const permissionSchemas = {
  checkPermission: z.object({
    userId: z.string(),
    permission: z.string(),
    resource: z.string().optional(),
    resourceId: z.string().optional()
  }),

  checkRole: z.object({
    userId: z.string(),
    requiredRole: z.string(),
    minimumRole: z.boolean().optional()
  }),

  getUserPermissions: z.object({
    userId: z.string()
  })
}

// Admin authentication class
export class AdminAuth {
  constructor() {
    this.permissionCache = new Map()
    this.userCache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // Get user from Clerk and cache
  async getUser(userId) {
    try {
      // Check cache first
      const cached = this.userCache.get(userId)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.user
      }

      // Fetch from Clerk
      const user = await clerkClient.users.getUser(userId)
      
      // Cache the user
      this.userCache.set(userId, {
        user,
        timestamp: Date.now()
      })

      return user
    } catch (error) {
      console.error('Error fetching user from Clerk:', error)
      throw new Error('Failed to fetch user information')
    }
  }

  // Get user's admin role from Clerk metadata
  async getUserRole(userId) {
    try {
      const user = await this.getUser(userId)
      
      // Check for admin role in public metadata
      const adminRole = user.publicMetadata?.adminRole || user.publicMetadata?.role
      
      if (!adminRole || !Object.values(ADMIN_ROLES).includes(adminRole)) {
        return ADMIN_ROLES.VIEWER // Default to lowest permission level
      }

      return adminRole
    } catch (error) {
      console.error('Error getting user role:', error)
      return ADMIN_ROLES.VIEWER
    }
  }

  // Get user's permissions based on role
  async getUserPermissions(userId) {
    try {
      // Check cache first
      const cacheKey = `permissions_${userId}`
      const cached = this.permissionCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.permissions
      }

      const role = await this.getUserRole(userId)
      const permissions = ROLE_PERMISSIONS[role] || []

      // Cache the permissions
      this.permissionCache.set(cacheKey, {
        permissions,
        timestamp: Date.now()
      })

      return permissions
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return []
    }
  }

  // Check if user has specific permission
  async hasPermission(userId, permission, resource = null, resourceId = null) {
    try {
      const permissions = await this.getUserPermissions(userId)
      
      // Super admin has all permissions
      if (permissions.includes(PERMISSIONS.SYSTEM_LOGS)) {
        return true
      }

      // Check if user has the specific permission
      const hasPermission = permissions.includes(permission)
      
      if (!hasPermission) {
        return false
      }

      // Additional resource-specific checks can be added here
      // For example, checking if user can only edit their own resources
      
      return true
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  // Check if user has required role or higher
  async hasRole(userId, requiredRole, minimumRole = false) {
    try {
      const userRole = await this.getUserRole(userId)
      
      if (minimumRole) {
        // Check if user has minimum required role
        const roleHierarchy = Object.values(ADMIN_ROLES)
        const userRoleIndex = roleHierarchy.indexOf(userRole)
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
        
        return userRoleIndex >= requiredRoleIndex
      } else {
        // Check if user has exact role
        return userRole === requiredRole
      }
    } catch (error) {
      console.error('Error checking role:', error)
      return false
    }
  }

  // Validate admin access for API endpoints
  async validateAdminAccess(req, res, next) {
    try {
      const userId = req.auth?.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Check if user has any admin role
      const role = await this.getUserRole(userId)
      if (role === ADMIN_ROLES.VIEWER) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      // Add user info to request for downstream use
      req.adminUser = {
        userId,
        role,
        permissions: await this.getUserPermissions(userId)
      }

      next()
    } catch (error) {
      console.error('Admin access validation error:', error)
      return res.status(500).json({ error: 'Access validation failed' })
    }
  }

  // Validate specific permission for API endpoints
  async validatePermission(permission, resource = null) {
    return async (req, res, next) => {
      try {
        const userId = req.auth?.userId
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const hasPermission = await this.hasPermission(userId, permission, resource)
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: permission,
            resource
          })
        }

        next()
      } catch (error) {
        console.error('Permission validation error:', error)
        return res.status(500).json({ error: 'Permission validation failed' })
      }
    }
  }

  // Get admin user summary for frontend
  async getAdminUserSummary(userId) {
    try {
      const [user, role, permissions] = await Promise.all([
        this.getUser(userId),
        this.getUserRole(userId),
        this.getUserPermissions(userId)
      ])

      return {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        permissions,
        isActive: user.publicMetadata?.isActive !== false,
        lastLogin: user.lastSignInAt,
        createdAt: user.createdAt
      }
    } catch (error) {
      console.error('Error getting admin user summary:', error)
      throw error
    }
  }

  // Clear user caches (useful for role/permission updates)
  clearUserCaches(userId) {
    this.userCache.delete(userId)
    this.permissionCache.delete(`permissions_${userId}`)
  }

  // Clear all caches
  clearAllCaches() {
    this.userCache.clear()
    this.permissionCache.clear()
  }
}

// Create singleton instance
export const adminAuth = new AdminAuth()

// Export convenience functions
export const hasPermission = (permission, resource = null) => 
  adminAuth.validatePermission(permission, resource)

export const hasRole = (requiredRole, minimumRole = false) => 
  adminAuth.validateRole(requiredRole, minimumRole)

export const validateAdminAccess = () => 
  adminAuth.validateAdminAccess.bind(adminAuth)

// Export everything
export default {
  AdminAuth,
  adminAuth,
  ADMIN_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasRole,
  validateAdminAccess,
  permissionSchemas
}
