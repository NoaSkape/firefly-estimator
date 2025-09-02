// Simple Admin Authentication - Following Established Patterns
import { verifyToken } from '@clerk/backend'

// Simple middleware that follows the working patterns in this codebase
export async function validateAdminAccess(req, res, next) {
  try {
    // Extract Bearer token
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token with Clerk using the SAME pattern as lib/auth.js and api/admin/settings.js
    try {
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const userId = verified?.sub || verified?.userId || null;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Add user info to request (simple approach for testing)
      req.adminUser = { 
        userId,
        role: 'admin', // Simplified for testing - real impl would check permissions
        permissions: ['FINANCIAL_VIEW', 'BUILD_EDIT', 'MODEL_EDIT', 'USER_MANAGE', 'BLOG_EDIT']
      };
      next();
      
    } catch (clerkError) {
      console.error('Clerk token verification failed:', clerkError.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
  } catch (error) {
    console.error('Admin auth error:', error.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Simple permission validation (just returns true for now)
export function validatePermission(permission) {
  return (req, res, next) => {
    // For now, just allow if authenticated
    next();
  };
}
