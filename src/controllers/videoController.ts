import { Request, Response } from 'express';
import { GolemDBService } from '../services/golemDbService';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { Video, UserVideoAccess } from '../types';
import { metadataToObject } from '../utils/helpers';

/**
 * Video Controller for handling video-related API endpoints
 */
export class VideoController {
  constructor(
    private golemDB: GolemDBService,
    private authMiddleware: AuthMiddleware
  ) {}

  /**
   * Get all active videos (public endpoint)
   */
  getVideos = async (req: Request, res: Response) => {
    try {
      const videos = await this.golemDB.getActiveVideos();

      // Remove sensitive information and format response
      const formattedVideos = videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        metadata: metadataToObject(video.metadata),
        mediaUrls: {
          thumbnail: video.mediaUrls.thumbnail,
          preview: video.mediaUrls.preview
        },
        associatedCards: video.associatedCards,
        tags: video.tags,
        createdAt: video.createdAt
      }));

      res.json({
        success: true,
        count: formattedVideos.length,
        videos: formattedVideos
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ 
        error: 'Failed to fetch videos' 
      });
    }
  };

  /**
   * Get video by ID (public endpoint with optional auth)
   */
  getVideoById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          error: 'Video ID is required' 
        });
      }

      const video = await this.golemDB.getVideoById(id);

      if (!video) {
        return res.status(404).json({ 
          error: 'Video not found' 
        });
      }

      if (!video.isActive) {
        return res.status(404).json({ 
          error: 'Video not available' 
        });
      }

      // Check if user has access (if authenticated)
      let hasAccess = false;
      let userAccess: UserVideoAccess | null = null;

      if (req.user) {
        hasAccess = await this.golemDB.checkUserVideoAccess(req.user.id, video.id);
        // In a real implementation, you'd fetch the actual access record
      }

      // Format response
      const response = {
        id: video.id,
        title: video.title,
        description: video.description,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        metadata: metadataToObject(video.metadata),
        mediaUrls: {
          thumbnail: video.mediaUrls.thumbnail,
          preview: video.mediaUrls.preview
        },
        associatedCards: video.associatedCards,
        tags: video.tags,
        hasAccess: hasAccess,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      };

      res.json({
        success: true,
        video: response
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({ 
        error: 'Failed to fetch video' 
      });
    }
  };

  /**
   * Get secure video content URL (requires content access)
   */
  getVideoContent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          error: 'Video ID is required' 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      const video = await this.golemDB.getVideoById(id);

      if (!video) {
        return res.status(404).json({ 
          error: 'Video not found' 
        });
      }

      if (!video.isActive) {
        return res.status(404).json({ 
          error: 'Video not available' 
        });
      }

      // Check if user has access to this video
      const hasAccess = await this.golemDB.checkUserVideoAccess(req.user.id, video.id);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access to this video requires purchase or subscription' 
        });
      }

      // Return secure video URL
      // In a real implementation, this might be a signed URL or streamed content
      res.json({
        success: true,
        videoUrl: video.mediaUrls.video,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour expiration
      });
    } catch (error) {
      console.error('Error accessing video content:', error);
      res.status(500).json({ 
        error: 'Failed to access video content' 
      });
    }
  };

  /**
   * Search videos by metadata
   */
  searchVideos = async (req: Request, res: Response) => {
    try {
      const { query, category, type, tags } = req.query;

      const videos = await this.golemDB.getActiveVideos();

      // Filter videos based on search criteria
      const filteredVideos = videos.filter(video => {
        // Text search in title and description
        if (query) {
          const searchTerm = (query as string).toLowerCase();
          if (!video.title.toLowerCase().includes(searchTerm) && 
              !video.description.toLowerCase().includes(searchTerm)) {
            return false;
          }
        }

        // Category filter
        if (category && video.category !== category) {
          return false;
        }

        // Type filter
        if (type && video.type !== type) {
          return false;
        }

        // Tags filter
        if (tags) {
          const tagList = Array.isArray(tags) ? tags : [tags];
          const videoTags = video.tags || [];
          if (!tagList.some(tag => videoTags.includes(tag as string))) {
            return false;
          }
        }

        return true;
      });

      // Format response
      const formattedVideos = filteredVideos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        metadata: metadataToObject(video.metadata),
        mediaUrls: {
          thumbnail: video.mediaUrls.thumbnail
        },
        associatedCards: video.associatedCards,
        tags: video.tags,
        createdAt: video.createdAt
      }));

      res.json({
        success: true,
        count: formattedVideos.length,
        videos: formattedVideos
      });
    } catch (error) {
      console.error('Error searching videos:', error);
      res.status(500).json({ 
        error: 'Failed to search videos' 
      });
    }
  };

  /**
   * Get videos associated with a tarot card
   */
  getVideosByCard = async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      if (!cardId) {
        return res.status(400).json({ 
          error: 'Card ID is required' 
        });
      }

      // In a real implementation, you'd query GolemDB for card-video relationships
      // For now, we'll filter videos by associatedCards field
      const allVideos = await this.golemDB.getActiveVideos();
      const cardVideos = allVideos.filter(video => 
        video.associatedCards.includes(cardId)
      );

      // Format response
      const formattedVideos = cardVideos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        metadata: metadataToObject(video.metadata),
        mediaUrls: {
          thumbnail: video.mediaUrls.thumbnail
        },
        associatedCards: video.associatedCards,
        tags: video.tags,
        createdAt: video.createdAt
      }));

      res.json({
        success: true,
        count: formattedVideos.length,
        videos: formattedVideos
      });
    } catch (error) {
      console.error('Error fetching videos by card:', error);
      res.status(500).json({ 
        error: 'Failed to fetch videos for card' 
      });
    }
  };

  /**
   * Get user's purchased videos
   */
  getUserPurchasedVideos = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // In a real implementation, you'd query user_video_access collection
      // For now, we'll simulate this by checking all videos
      const allVideos = await this.golemDB.getActiveVideos();
      const purchasedVideos: Video[] = [];

      for (const video of allVideos) {
        const hasAccess = await this.golemDB.checkUserVideoAccess(req.user.id, video.id);
        if (hasAccess) {
          purchasedVideos.push(video);
        }
      }

      // Format response
      const formattedVideos = purchasedVideos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        metadata: metadataToObject(video.metadata),
        mediaUrls: {
          thumbnail: video.mediaUrls.thumbnail
        },
        associatedCards: video.associatedCards,
        tags: video.tags,
        createdAt: video.createdAt
      }));

      res.json({
        success: true,
        count: formattedVideos.length,
        videos: formattedVideos
      });
    } catch (error) {
      console.error('Error fetching user videos:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user videos' 
      });
    }
  };
}