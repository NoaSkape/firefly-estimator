// Admin Authentication and Authorization System
// Handles role-based access control, permissions, and security for the admin panel

import { createClerkClient } from '@clerk/backend'
import { requireAuth } from './auth.js'

// Initialize Clerk client
const clerkClient = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})
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

  assignRole: z.object({
    userId: z.string(),
    role: z.enum(Object.values(ADMIN_ROLES))
  }),

  updatePermissions: z.object({
    userId: z.string(),
    permissions: z.array(z.string())
  })
}

class AdminAuth {
  constructor() {
    this.userCache = new Map()
    this.permissionCache = new Map()
    this.roleCache = new Map()
  }

  // Get user from Clerk
  async getUser(userId) {
    try {
      if (!userId) {
        return null
      }

      // Check cache first
      if (this.userCache.has(userId)) {
        return this.userCache.get(userId)
      }

      const user = await clerkClient.users.getUser(userId)
      
      // Cache the user
      this.userCache.set(userId, user)
      
      return user
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Get user role from Clerk metadata
  async getUserRole(userId) {
    try {
      if (!userId) {
        return ADMIN_ROLES.VIEWER
      }

      // Check cache first
      const cacheKey = `role_${userId}`
      if (this.roleCache.has(cacheKey)) {
        return this.roleCache.get(cacheKey)
      }

      const user = await this.getUser(userId)
      if (!user) return ADMIN_ROLES.VIEWER

      // Check public metadata for role
      const role = user.publicMetadata?.role || ADMIN_ROLES.VIEWER
      
      // Validate role exists
      if (!Object.values(ADMIN_ROLES).includes(role)) {
        return ADMIN_ROLES.VIEWER
      }

      // Cache the role
      this.roleCache.set(cacheKey, role)
      
      return role
    } catch (error) {
      console.error('Error getting user role:', error)
      return ADMIN_ROLES.VIEWER
    }
  }

  // Get user permissions based on role
  async getUserPermissions(userId) {
    try {
      if (!userId) {
        return []
      }

      // Check cache first
      const cacheKey = `permissions_${userId}`
      if (this.permissionCache.has(cacheKey)) {
        return this.permissionCache.get(cacheKey)
      }

      const role = await this.getUserRole(userId)
      const permissions = ROLE_PERMISSIONS[role] || []
      
      // Cache the permissions
      this.permissionCache.set(cacheKey, permissions)
      
      return permissions
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return []
    }
  }

  // Check if user has specific permission
  async hasPermission(userId, permission, resource = null, resourceId = null) {
    try {
      if (!userId || !permission) {
        return false
      }

      // Get user permissions
      const permissions = await this.getUserPermissions(userId)
      
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

  // Validate admin access for API endpoints - INTEGRATED WITH EXISTING AUTH
  async validateAdminAccess(req, res, next) {
    try {
      // Extract Bearer token from Authorization header
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;
      
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
      }

      let userId = null;
      try {
        const { verifyToken } = await import('@clerk/backend');
        const verified = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        userId = verified?.sub || verified?.userId || null;
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - No user ID' });
      }

      // Check if user has any admin role
      const role = await this.getUserRole(userId);
      if (!role || role === ADMIN_ROLES.VIEWER) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Add user info to request for downstream use
      req.adminUser = {
        userId,
        role,
        permissions: await this.getUserPermissions(userId)
      };

      next();
    } catch (error) {
      console.error('Admin access validation error:', error);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Access validation failed' });
      }
    }
  }

  // Validate specific permission for API endpoints
  validatePermission(permission, resource = null) {
    return (req, res, next) => {
      // Use Promise.resolve to handle the async operation properly
      Promise.resolve(this.hasPermission(req.adminUser?.userId, permission, resource))
        .then(hasPermission => {
          if (!hasPermission) {
            return res.status(403).json({ 
              error: 'Insufficient permissions',
              required: permission,
              resource
            })
          }
          next()
        })
        .catch(error => {
          console.error('Permission validation error:', error)
          return res.status(500).json({ error: 'Permission validation failed' })
        })
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
    this.roleCache.delete(`role_${userId}`)
  }

  // Clear all caches
  clearAllCaches() {
    this.userCache.clear()
    this.permissionCache.clear()
    this.roleCache.clear()
  }
}

// Create singleton instance
export const adminAuth = new AdminAuth()

// Export everything
export default {
  AdminAuth,
  adminAuth,
  ADMIN_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  permissionSchemas
}
