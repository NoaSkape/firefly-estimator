import { clerkClient, verifyToken } from '@clerk/backend';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  throw new Error('Please define the CLERK_SECRET_KEY environment variable inside .env');
}

/**
 * Verify that the request has a valid logged-in user
 */
export async function requireAuth(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add user info to request for use in route handlers
    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return payload;
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify that the logged-in user is an admin
 */
export async function requireAdmin(req, res) {
  try {
    const user = await requireAuth(req, res);
    
    if (res.statusCode === 401) {
      return; // Auth failed, response already sent
    }

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(user.sub);
    
    // Check if user has admin role (you can customize this logic)
    const isAdmin = clerkUser.publicMetadata?.role === 'admin' || 
                   clerkUser.emailAddresses?.some(email => 
                     email.emailAddress === process.env.ADMIN_EMAIL
                   );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return user;
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(403).json({ error: 'Admin authentication failed' });
  }
}

/**
 * Get user info without requiring authentication (for optional auth)
 */
export async function getUser(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    return {
      id: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
} 