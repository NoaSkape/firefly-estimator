// Simple Admin Authentication - Following Established Patterns
import { verifyToken } from '@clerk/backend'

// Simple middleware that follows the working patterns in this codebase
export async function validateAdminAccess(req, res, next) {
  console.log('[DEBUG_AUTH] Auth middleware called:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers?.authorization,
    authHeaderType: typeof req.headers?.authorization,
    authHeaderStart: req.headers?.authorization?.slice(0, 10) + '...',
    clerkSecretKeyPresent: !!process.env.CLERK_SECRET_KEY
  })
  
  try {
    // Extract Bearer token
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    
    console.log('[DEBUG_AUTH] Token extraction:', {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token?.length || 0
    })
    
    if (!token) {
      console.log('[DEBUG_AUTH] No token provided, returning 401')
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token with Clerk using the SAME pattern as lib/auth.js and api/admin/settings.js
    try {
      console.log('[DEBUG_AUTH] Attempting token verification...')
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const userId = verified?.sub || verified?.userId || null;
      
      console.log('[DEBUG_AUTH] Token verification result:', {
        hasVerified: !!verified,
        userId: userId,
        verifiedKeys: verified ? Object.keys(verified) : []
      })
      
      if (!userId) {
        console.log('[DEBUG_AUTH] No userId found in verified token, returning 401')
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Add user info to request (simple approach for testing)
      req.adminUser = { 
        userId,
        role: 'admin', // Simplified for testing - real impl would check permissions
        permissions: ['FINANCIAL_VIEW', 'BUILD_EDIT', 'MODEL_EDIT', 'USER_MANAGE', 'BLOG_EDIT']
      };
      
      console.log('[DEBUG_AUTH] Authentication successful, calling next()')
      next();
      
    } catch (clerkError) {
      console.error('[DEBUG_AUTH] Clerk token verification failed:', clerkError.message);
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
