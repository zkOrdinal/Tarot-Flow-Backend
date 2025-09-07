import { Request, Response } from 'express';
import { GolemDBService } from '../services/golemDbService';
import { BaseService } from '../services/baseService';
import { Video, SubscriptionTier } from '../types';

/**
 * Purchase Controller for handling payment processing and transactions
 */
export class PurchaseController {
  constructor(
    private golemDB: GolemDBService,
    private baseService: BaseService
  ) {}

  /**
   * Verify and record video purchase
   */
  verifyVideoPurchase = async (req: Request, res: Response) => {
    try {
      const { transactionHash, videoId, paymentToken } = req.body;
      const userId = req.user?.id;

      // Validate input
      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      if (!transactionHash || !videoId || !paymentToken) {
        return res.status(400).json({ 
          error: 'transactionHash, videoId, and paymentToken are required' 
        });
      }

      if (paymentToken !== 'USDC' && paymentToken !== 'ETH') {
        return res.status(400).json({ 
          error: 'paymentToken must be either USDC or ETH' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for purchases' 
        });
      }

      // Get video details
      const video = await this.golemDB.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ 
          error: 'Video not found' 
        });
      }

      if (!video.isActive) {
        return res.status(400).json({ 
          error: 'Video is not available for purchase' 
        });
      }

      // Verify payment on Base network
      let paymentResult;

      if (paymentToken === 'USDC') {
        paymentResult = await this.baseService.verifyUsdcPayment(
          transactionHash,
          video.pricing.singlePriceUsd,
          process.env.STORE_WALLET_ADDRESS || ''
        );
      } else {
        paymentResult = await this.baseService.verifyEthPayment(
          transactionHash,
          video.pricing.singlePriceUsd,
          process.env.STORE_WALLET_ADDRESS || ''
        );
      }

      if (!paymentResult.success) {
        return res.status(400).json({ 
          error: 'Payment verification failed' 
        });
      }

      // Check if user already has access to this video
      const hasAccess = await this.golemDB.checkUserVideoAccess(userId, videoId);
      if (hasAccess) {
        return res.status(400).json({ 
          error: 'User already has access to this video' 
        });
      }

      // Record successful purchase
      const accessRecord = await this.golemDB.recordUserVideoAccess({
        userId: userId,
        videoId: videoId,
        accessType: 'purchase',
        transactionHash: transactionHash,
        purchaseDate: new Date(),
        paymentToken: paymentToken,
        amountPaid: paymentResult.amount,
        watchHistory: [],
        isFavorite: false
      });

      res.json({
        success: true,
        message: 'Purchase verified and access granted',
        accessId: accessRecord.id,
        amountPaid: paymentResult.amount,
        paymentToken: paymentToken,
        transactionDetails: paymentResult.transactionDetails
      });
    } catch (error) {
      console.error('Video purchase verification failed:', error);
      res.status(500).json({ 
        error: `Purchase verification failed: ${error.message}` 
      });
    }
  };

  /**
   * Verify and record subscription purchase
   */
  verifySubscriptionPurchase = async (req: Request, res: Response) => {
    try {
      const { transactionHash, tierId, paymentToken } = req.body;
      const userId = req.user?.id;

      // Validate input
      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      if (!transactionHash || !tierId || !paymentToken) {
        return res.status(400).json({ 
          error: 'transactionHash, tierId, and paymentToken are required' 
        });
      }

      if (paymentToken !== 'USDC' && paymentToken !== 'ETH') {
        return res.status(400).json({ 
          error: 'paymentToken must be either USDC or ETH' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for purchases' 
        });
      }

      // Get subscription tier details
      const tier = await this.golemDB.getSubscriptionTierById(tierId);
      if (!tier) {
        return res.status(404).json({ 
          error: 'Subscription tier not found' 
        });
      }

      if (!tier.isActive) {
        return res.status(400).json({ 
          error: 'Subscription tier is not available' 
        });
      }

      // Verify payment on Base network
      let paymentResult;

      if (paymentToken === 'USDC') {
        paymentResult = await this.baseService.verifyUsdcPayment(
          transactionHash,
          tier.priceUsd,
          process.env.STORE_WALLET_ADDRESS || ''
        );
      } else {
        paymentResult = await this.baseService.verifyEthPayment(
          transactionHash,
          tier.priceUsd,
          process.env.STORE_WALLET_ADDRESS || ''
        );
      }

      if (!paymentResult.success) {
        return res.status(400).json({ 
          error: 'Payment verification failed' 
        });
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + tier.durationDays);

      // Update user with subscription information
      const updatedUser = await this.golemDB.updateUser(userId, {
        subscription: {
          tierId: tier.id,
          startDate: startDate,
          endDate: endDate,
          isActive: true
        },
        updatedAt: new Date()
      });

      if (!updatedUser) {
        return res.status(500).json({ 
          error: 'Failed to update user subscription' 
        });
      }

      res.json({
        success: true,
        message: 'Subscription purchased successfully',
        subscription: {
          tierId: tier.id,
          tierName: tier.name,
          startDate: startDate,
          endDate: endDate,
          isActive: true
        },
        amountPaid: paymentResult.amount,
        paymentToken: paymentToken,
        transactionDetails: paymentResult.transactionDetails
      });
    } catch (error) {
      console.error('Subscription purchase verification failed:', error);
      res.status(500).json({ 
        error: `Subscription purchase failed: ${error.message}` 
      });
    }
  };

  /**
   * Get user's subscription status
   */
  getSubscriptionStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Get user details
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      const subscription = user.subscription;
      const isActive = subscription?.isActive && 
                      !!subscription.endDate && 
                      subscription.endDate > new Date();

      res.json({
        success: true,
        hasSubscription: !!subscription,
        isActive: isActive,
        subscription: subscription ? {
          tierId: subscription.tierId,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isActive: subscription.isActive
        } : null
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch subscription status' 
      });
    }
  };

  /**
   * Get available subscription tiers
   */
  getSubscriptionTiers = async (req: Request, res: Response) => {
    try {
      const tiers = await this.golemDB.getActiveSubscriptionTiers();

      // Format response
      const formattedTiers = tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        priceUsd: tier.priceUsd,
        durationDays: tier.durationDays,
        benefits: tier.benefits,
        isActive: tier.isActive
      }));

      res.json({
        success: true,
        count: formattedTiers.length,
        tiers: formattedTiers
      });
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      res.status(500).json({ 
        error: 'Failed to fetch subscription tiers' 
      });
    }
  };

  /**
   * Cancel subscription (deactivate)
   */
  cancelSubscription = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Get user details
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      if (!user.subscription || !user.subscription.isActive) {
        return res.status(400).json({ 
          error: 'No active subscription found' 
        });
      }

      // Deactivate subscription
      const updatedUser = await this.golemDB.updateUser(userId, {
        subscription: {
          ...user.subscription,
          isActive: false
        },
        updatedAt: new Date()
      });

      if (!updatedUser) {
        return res.status(500).json({ 
          error: 'Failed to cancel subscription' 
        });
      }

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        subscription: {
          tierId: updatedUser.subscription?.tierId,
          startDate: updatedUser.subscription?.startDate,
          endDate: updatedUser.subscription?.endDate,
          isActive: false
        }
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ 
        error: 'Failed to cancel subscription' 
      });
    }
  };
}