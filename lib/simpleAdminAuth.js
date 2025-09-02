// Simple Admin Authentication - Just Works
import { createClerkClient } from '@clerk/backend'

// Initialize Clerk client
let clerkClient = null;
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });
  }
} catch (error) {
  console.error('Failed to initialize Clerk client:', error.message);
}

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
      if (!clerkClient) {
        throw new Error('Clerk client not initialized');
      }
      
      const verified = await clerkClient.verifyToken(token);
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
