import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { GolemDBService } from '../services/golemDbService';
import { User } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication Middleware
 */
export class AuthMiddleware {
  private authService: AuthService;

  constructor(golemDB: GolemDBService) {
    this.authService = new AuthService(golemDB);
  }

  /**
   * Require authentication for protected routes
   */
  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Authentication required. Please provide a valid JWT token.' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = this.authService.verifyToken(token);

      // In a real implementation, you might want to verify the user still exists
      // For now, we'll reconstruct the user object from the token
      const user: User = {
        id: decoded.id,
        walletAddress: decoded.walletAddress,
        role: decoded.role as 'user' | 'admin',
        whitelistStatus: decoded.whitelistStatus as 'approved' | 'pending' | 'rejected',
        createdAt: new Date(0), // Placeholder,
        updatedAt: new Date(0),
      };

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }
  };

  /**
   * Require admin role for protected routes
   */
  requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    await this.requireAuth(req, res, async () => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin privileges required' 
        });
      }
      next();
    });
  };

  /**
   * Require whitelist approval for premium features
   */
  requireWhitelist = async (req: Request, res: Response, next: NextFunction) => {
    await this.requireAuth(req, res, async () => {
      if (!req.user || req.user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted. Contact administrator for access.' 
        });
      }
      next();
    });
  };

  /**
   * Require either whitelist or active subscription for content access
   */
  requireContentAccess = async (req: Request, res: Response, next: NextFunction) => {
    await this.requireAuth(req, res, async () => {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Check if user is whitelisted
      if (req.user.whitelistStatus === 'approved') {
        return next();
      }

      // Check if user has active subscription
      const hasSubscription = await this.authService.hasSubscriptionAccess(req.user);
      if (hasSubscription) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Content access requires whitelist approval or active subscription' 
      });
    });
  };

  /**
   * Optional authentication - attach user if token is valid, but don't require it
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // No token, continue without user
      }

      const token = authHeader.substring(7);
      const decoded = this.authService.verifyToken(token);

      const user: User = {
        id: decoded.id,
        walletAddress: decoded.walletAddress,
        role: decoded.role as 'user' | 'admin',
        whitelistStatus: decoded.whitelistStatus as 'approved' | 'pending' | 'rejected',
        createdAt: new Date(0),
        updatedAt: new Date(0)
      };

      req.user = user;
      next();
    } catch (error) {
      // Invalid token, continue without user
      next();
    }
  };
}