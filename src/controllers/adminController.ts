import { Request, Response } from 'express';
import { GolemDBService } from '../services/golemDbService';
import { Video, TarotCard, SubscriptionTier } from '../types';

/**
 * Admin Controller for content management and administrative functions
 */
export class AdminController {
  constructor(private golemDB: GolemDBService) {}

  /**
   * Create a new video
   */
  createVideo = async (req: Request, res: Response) => {
    try {
      const videoData = req.body;

      // Validate required fields
      if (!videoData.title || !videoData.type || !videoData.pricing) {
        return res.status(400).json({ 
          error: 'Title, type, and pricing are required' 
        });
      }

      if (!videoData.pricing.singlePriceUsd) {
        return res.status(400).json({ 
          error: 'singlePriceUsd is required in pricing' 
        });
      }

      if (!videoData.mediaUrls || !videoData.mediaUrls.video) {
        return res.status(400).json({ 
          error: 'Video URL is required in mediaUrls' 
        });
      }

      // Create video
      const video = await this.golemDB.createVideo(videoData);

      res.status(201).json({
        success: true,
        message: 'Video created successfully',
        video: {
          id: video.id,
          title: video.title,
          type: video.type
        }
      });
    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({ 
        error: 'Failed to create video' 
      });
    }
  };

  /**
   * Update an existing video
   */
  updateVideo = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({ 
          error: 'Video ID is required' 
        });
      }

      // Get existing video
      const existingVideo = await this.golemDB.getVideoById(id);
      if (!existingVideo) {
        return res.status(404).json({ 
          error: 'Video not found' 
        });
      }

      // Remove protected fields from updates
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;

      // Update video (in GolemDB this creates a new version)
      const updatedVideoData = {
        ...existingVideo,
        ...updates
      };

      const updatedVideo = await this.golemDB.createVideo(updatedVideoData);

      res.json({
        success: true,
        message: 'Video updated successfully',
        video: {
          id: updatedVideo.id,
          title: updatedVideo.title,
          updatedAt: updatedVideo.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({ 
        error: 'Failed to update video' 
      });
    }
  };

  /**
   * Bulk update video prices
   */
  bulkUpdatePrices = async (req: Request, res: Response) => {
    try {
      const { videoIds, newPriceUsd } = req.body;

      if (!Array.isArray(videoIds) || !newPriceUsd) {
        return res.status(400).json({ 
          error: 'videoIds array and newPriceUsd are required' 
        });
      }

      if (videoIds.length === 0) {
        return res.status(400).json({ 
          error: 'At least one video ID is required' 
        });
      }

      // Validate price format
      const priceNum = parseFloat(newPriceUsd);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ 
          error: 'newPriceUsd must be a valid positive number' 
        });
      }

      let updatedCount = 0;

      // Update each video
      for (const videoId of videoIds) {
        const video = await this.golemDB.getVideoById(videoId);
        if (video) {
          const updatedVideoData = {
            ...video,
            pricing: {
              ...video.pricing,
              singlePriceUsd: newPriceUsd
            }
          };

          await this.golemDB.createVideo(updatedVideoData);
          updatedCount++;
        }
      }

      res.json({
        success: true,
        message: `Updated prices for ${updatedCount} videos`,
        updatedCount: updatedCount
      });
    } catch (error) {
      console.error('Error bulk updating prices:', error);
      res.status(500).json({ 
        error: 'Failed to bulk update prices' 
      });
    }
  };

  /**
   * Create a new tarot card
   */
  createTarotCard = async (req: Request, res: Response) => {
    try {
      const cardData = req.body;

      // Validate required fields
      if (!cardData.name || !cardData.arcana) {
        return res.status(400).json({ 
          error: 'Name and arcana are required' 
        });
      }

      if (!cardData.keywords || !Array.isArray(cardData.keywords)) {
        return res.status(400).json({ 
          error: 'Keywords array is required' 
        });
      }

      if (!cardData.uprightMeaning || !cardData.reversedMeaning) {
        return res.status(400).json({ 
          error: 'Both uprightMeaning and reversedMeaning are required' 
        });
      }

      // Create tarot card
      const card = await this.golemDB.createTarotCard(cardData);

      res.status(201).json({
        success: true,
        message: 'Tarot card created successfully',
        card: {
          id: card.id,
          name: card.name,
          arcana: card.arcana
        }
      });
    } catch (error) {
      console.error('Error creating tarot card:', error);
      res.status(500).json({ 
        error: 'Failed to create tarot card' 
      });
    }
  };

  /**
   * Create subscription tier
   */
  createSubscriptionTier = async (req: Request, res: Response) => {
    try {
      const tierData = req.body;

      // Validate required fields
      if (!tierData.name || !tierData.priceUsd || !tierData.durationDays) {
        return res.status(400).json({ 
          error: 'Name, priceUsd, and durationDays are required' 
        });
      }

      // Validate price
      const priceNum = parseFloat(tierData.priceUsd);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ 
          error: 'priceUsd must be a valid positive number' 
        });
      }

      // Validate duration
      if (tierData.durationDays <= 0) {
        return res.status(400).json({ 
          error: 'durationDays must be a positive number' 
        });
      }

      // Create subscription tier
      const tier = await this.golemDB.createSubscriptionTier(tierData);

      res.status(201).json({
        success: true,
        message: 'Subscription tier created successfully',
        tier: {
          id: tier.id,
          name: tier.name,
          priceUsd: tier.priceUsd,
          durationDays: tier.durationDays,
          isActive: tier.isActive
        }
      });
    } catch (error) {
      console.error('Error creating subscription tier:', error);
      res.status(500).json({ 
        error: 'Failed to create subscription tier' 
      });
    }
  };

  /**
   * Update subscription tier
   */
  updateSubscriptionTier = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({ 
          error: 'Tier ID is required' 
        });
      }

      // Get existing tier
      const existingTier = await this.golemDB.getSubscriptionTierById(id);
      if (!existingTier) {
        return res.status(404).json({ 
          error: 'Subscription tier not found' 
        });
      }

      // Remove protected fields
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;

      // Update tier
      const updatedTierData = {
        ...existingTier,
        ...updates
      };

      const updatedTier = await this.golemDB.createSubscriptionTier(updatedTierData);

      res.json({
        success: true,
        message: 'Subscription tier updated successfully',
        tier: {
          id: updatedTier.id,
          name: updatedTier.name,
          updatedAt: updatedTier.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating subscription tier:', error);
      res.status(500).json({ 
        error: 'Failed to update subscription tier' 
      });
    }
  };

  /**
   * Add user to whitelist
   */
  addUserToWhitelist = async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ 
          error: 'walletAddress is required' 
        });
      }

      // Validate wallet address format
      if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
        return res.status(400).json({ 
          error: 'Invalid wallet address format' 
        });
      }

      // Find user by wallet address
      let user = await this.golemDB.findUserByWallet(walletAddress);

      // If user doesn't exist, create them
      if (!user) {
        user = await this.golemDB.createUser({
          walletAddress: walletAddress,
          role: 'user',
          whitelistStatus: 'approved' // Directly approve
        });
      } else {
        // Update existing user's whitelist status
        user = await this.golemDB.updateUser(user.id, {
          whitelistStatus: 'approved',
          updatedAt: new Date()
        });
      }

      if (!user) {
        return res.status(500).json({ 
          error: 'Failed to whitelist user' 
        });
      }

      res.json({
        success: true,
        message: 'User added to whitelist successfully',
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          whitelistStatus: user.whitelistStatus
        }
      });
    } catch (error) {
      console.error('Error whitelisting user:', error);
      res.status(500).json({ 
        error: 'Failed to whitelist user' 
      });
    }
  };

  /**
   * Remove user from whitelist
   */
  removeUserFromWhitelist = async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ 
          error: 'walletAddress is required' 
        });
      }

      // Find user by wallet address
      const user = await this.golemDB.findUserByWallet(walletAddress);

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      // Update user's whitelist status
      const updatedUser = await this.golemDB.updateUser(user.id, {
        whitelistStatus: 'rejected',
        updatedAt: new Date()
      });

      if (!updatedUser) {
        return res.status(500).json({ 
          error: 'Failed to update user whitelist status' 
        });
      }

      res.json({
        success: true,
        message: 'User removed from whitelist successfully',
        user: {
          id: updatedUser.id,
          walletAddress: updatedUser.walletAddress,
          whitelistStatus: updatedUser.whitelistStatus
        }
      });
    } catch (error) {
      console.error('Error removing user from whitelist:', error);
      res.status(500).json({ 
        error: 'Failed to remove user from whitelist' 
      });
    }
  };

  /**
   * Get whitelist statistics
   */
  getWhitelistStats = async (req: Request, res: Response) => {
    try {
      // In a real implementation, you'd query all users and count statuses
      // For now, we'll simulate with a placeholder response
      res.json({
        success: true,
        stats: {
          totalUsers: 0,
          whitelisted: 0,
          pending: 0,
          rejected: 0
        }
      });
    } catch (error) {
      console.error('Error fetching whitelist stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch whitelist statistics' 
      });
    }
  };

  /**
   * Bulk import videos from JSON data
   */
  bulkImportVideos = async (req: Request, res: Response) => {
    try {
      const { videos } = req.body;

      if (!Array.isArray(videos)) {
        return res.status(400).json({ 
          error: 'videos must be an array' 
        });
      }

      if (videos.length === 0) {
        return res.status(400).json({ 
          error: 'At least one video is required' 
        });
      }

      let importedCount = 0;
      const errors: any = []; //FIXME any

      // Import each video
      for (const videoData of videos) {
        try {
          // Validate required fields for each video
          if (!videoData.title || !videoData.type || !videoData.pricing || !videoData.pricing.singlePriceUsd) {
            errors.push(`Video missing required fields: ${videoData.title || 'Untitled'}`);
            continue;
          }

          await this.golemDB.createVideo(videoData);
          importedCount++;
        } catch (err) {
          errors.push(`Failed to import video ${videoData.title}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: `Imported ${importedCount} videos`,
        importedCount: importedCount,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk importing videos:', error);
      res.status(500).json({ 
        error: 'Failed to bulk import videos' 
      });
    }
  };
}