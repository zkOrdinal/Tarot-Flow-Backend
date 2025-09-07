import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { GolemDBService } from './golemDbService';
import { User } from '../types';
import { JWT_SECRET } from '../config/networks';

/**
 * Authentication Service for user authentication and authorization
 */
export class AuthService {
  private golemDB: GolemDBService;

  constructor(golemDB: GolemDBService) {
    this.golemDB = golemDB;
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      whitelistStatus: user.whitelistStatus
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'tarot-video-storefront'
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { 
    id: string; 
    walletAddress: string; 
    role: string;
    whitelistStatus: string;
    iat: number;
    exp: number;
  } {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Authenticate user by wallet address
   */
  async authenticateUser(walletAddress: string): Promise<{ 
    user: User; 
    token: string 
  } | null> {
    try {
      // Find user by wallet address
      let user = await this.golemDB.findUserByWallet(walletAddress);

      // If user doesn't exist, create new user
      if (!user) {
        user = await this.golemDB.createUser({
          walletAddress: walletAddress,
          role: 'user',
          whitelistStatus: 'pending' // Default to pending until approved
        });
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Update last login
      await this.golemDB.updateUser(user.id, {
        lastLogin: new Date()
      });

      return { user, token };
    } catch (error) {
      console.error('Authentication failed:', error);
      return null;
    }
  }

  /**
   * Hash password for admin users
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password for admin users
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create admin user (for bootstrap process)
   */
  async createAdminUser(email: string, password: string): Promise<User> {
    // Check if any users exist
    // Note: In a real implementation, you'd need a way to check this
    // For now, we'll assume this is only called during bootstrap

    const hashedPassword = await this.hashPassword(password);

    // In a real implementation, you'd store the password hash somewhere
    // For now, we'll create a regular user with admin role
    const adminUser = await this.golemDB.createUser({
      walletAddress: `admin-${Date.now()}`, // Placeholder wallet address
      role: 'admin',
      whitelistStatus: 'approved',
      email: email // Note: In production, this should be encrypted
    });

    return adminUser;
  }

  /**
   * Authenticate admin user
   */
  async authenticateAdmin(email: string, password: string): Promise<{ 
    user: User; 
    token: string 
  } | null> {
    // In a real implementation, you'd look up the admin user and verify password
    // For now, we'll simulate this
    console.warn('Admin authentication is simulated - implement proper admin auth in production');

    // This is a placeholder - implement proper admin authentication
    const user: User = {
      id: 'admin-placeholder',
      walletAddress: 'admin-wallet',
      role: 'admin',
      whitelistStatus: 'approved',
      email: email,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Check if user has required role
   */
  hasRole(user: User, requiredRole: 'user' | 'admin'): boolean {
    if (requiredRole === 'user') {
      return user.role === 'user' || user.role === 'admin';
    }
    return user.role === 'admin';
  }

  /**
   * Check if user is whitelisted
   */
  isWhitelisted(user: User): boolean {
    return user.whitelistStatus === 'approved';
  }

  /**
   * Check if user has subscription access
   */
  async hasSubscriptionAccess(user: User): Promise<boolean> {
    if (!user.subscription) return false;

    return user.subscription.isActive && 
           !!user.subscription.endDate && 
           user.subscription.endDate > new Date();
  }
}