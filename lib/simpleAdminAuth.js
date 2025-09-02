// Simple Admin Authentication - Just Works
import { verifyToken } from '@clerk/backend'

// Simple middleware that actually works
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

    // Verify token with Clerk
    try {
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const userId = verified?.sub || verified?.userId || null;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Add user info to request
      req.adminUser = { userId };
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
